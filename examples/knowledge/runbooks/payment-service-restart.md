# Payment Service Restart Runbook

## Overview
This runbook describes the procedure for restarting the payment-service when it becomes unresponsive or degraded.

## Service Information
- **Service Name:** payment-service
- **Owner:** Payments Team
- **Criticality:** High (revenue-impacting)
- **SLA:** 99.9% uptime

## Prerequisites
- Access to production Kubernetes cluster
- `kubectl` configured with appropriate credentials
- Slack access to #payments-oncall channel

## When to Use
Use this runbook when:
- Payment service health checks are failing
- Transaction error rate exceeds 1%
- Response latency exceeds 2 seconds (p99)
- Memory usage exceeds 85% for more than 10 minutes

## Procedure

### Step 1: Verify the Issue
```bash
# Check pod status
kubectl get pods -n payments -l app=payment-service

# Check recent logs for errors
kubectl logs -n payments -l app=payment-service --tail=100 | grep -i error

# Check service metrics
curl -s http://payment-service.payments.svc:8080/metrics | grep payment_
```

**Expected output:** Pods should show Running status. Look for OOM kills, crash loops, or high error rates in logs.

### Step 2: Notify Stakeholders
Post in #payments-oncall:
```
🔄 PAYMENT SERVICE RESTART
Initiating restart due to: [describe issue]
Impact: Brief interruption to payment processing
ETA: 5 minutes
```

### Step 3: Perform Rolling Restart
```bash
# Rolling restart (preferred - no downtime)
kubectl rollout restart deployment/payment-service -n payments

# Monitor the rollout
kubectl rollout status deployment/payment-service -n payments
```

**Note:** Rolling restart maintains availability by keeping old pods running until new ones are healthy.

### Step 4: Verify Recovery
```bash
# Check all pods are running
kubectl get pods -n payments -l app=payment-service

# Verify health endpoint
curl -s http://payment-service.payments.svc:8080/health

# Check recent transactions
curl -s http://payment-service.payments.svc:8080/metrics | grep payment_transactions_total
```

**Success criteria:**
- All pods show Running status
- Health endpoint returns 200
- Transaction success rate above 99%
- Latency below 500ms (p99)

### Step 5: Update Stakeholders
Post in #payments-oncall:
```
✅ PAYMENT SERVICE RESTART COMPLETE
All pods healthy. Monitoring for stability.
```

## Rollback
If the restart makes things worse:
```bash
# Rollback to previous version
kubectl rollout undo deployment/payment-service -n payments
```

## Troubleshooting

### Pods stuck in Pending
- Check node resources: `kubectl describe nodes`
- Check PVC availability if using persistent storage

### Pods in CrashLoopBackOff
- Check logs: `kubectl logs -n payments <pod-name> --previous`
- Check resource limits in deployment spec
- Escalate to Payments Team

### Database connection issues
- Check database connectivity from pod
- Verify connection pool settings
- See: Database Connection Pool Reset Runbook

## Related Runbooks
- Database Connection Pool Reset
- Payment Gateway Failover
- Cache Invalidation Procedure

## Contact
- **Primary:** Payments Team (#payments)
- **Escalation:** Platform Engineering (#platform-eng)
- **After hours:** PagerDuty - payments-primary

## Revision History
| Date | Author | Changes |
|------|--------|---------|
| 2026-01-15 | J. Smith | Initial version |
| 2026-01-28 | A. Jones | Added troubleshooting section |
