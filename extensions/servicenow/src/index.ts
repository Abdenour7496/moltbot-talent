/**
 * ServiceNow Integration for Moltbot Talent
 * 
 * Provides incident and change management capabilities through ServiceNow's REST API.
 */

import axios, { type AxiosInstance } from 'axios';
import { z } from 'zod';

// Configuration schema
const ServiceNowConfigSchema = z.object({
  instance: z.string().describe('ServiceNow instance URL (e.g., company.service-now.com)'),
  username: z.string().optional().describe('Username for basic auth'),
  password: z.string().optional().describe('Password for basic auth'),
  oauthClientId: z.string().optional().describe('OAuth client ID'),
  oauthClientSecret: z.string().optional().describe('OAuth client secret'),
  oauthToken: z.string().optional().describe('OAuth access token'),
});

export type ServiceNowConfig = z.infer<typeof ServiceNowConfigSchema>;

// Incident schema
const IncidentSchema = z.object({
  number: z.string().optional(),
  sys_id: z.string().optional(),
  short_description: z.string(),
  description: z.string().optional(),
  severity: z.number().min(1).max(4).default(3),
  urgency: z.number().min(1).max(3).default(2),
  impact: z.number().min(1).max(3).default(2),
  assignment_group: z.string().optional(),
  assigned_to: z.string().optional(),
  state: z.number().optional(),
  work_notes: z.string().optional(),
});

export type Incident = z.infer<typeof IncidentSchema>;

// Change request schema
const ChangeRequestSchema = z.object({
  number: z.string().optional(),
  sys_id: z.string().optional(),
  short_description: z.string(),
  description: z.string().optional(),
  type: z.enum(['standard', 'normal', 'emergency']).default('normal'),
  risk: z.enum(['low', 'moderate', 'high']).default('moderate'),
  assignment_group: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export type ChangeRequest = z.infer<typeof ChangeRequestSchema>;

/**
 * ServiceNow Client
 */
export class ServiceNowClient {
  private client: AxiosInstance;
  private config: ServiceNowConfig;

  constructor(config: ServiceNowConfig) {
    this.config = ServiceNowConfigSchema.parse(config);
    
    const baseURL = `https://${this.config.instance}/api/now/table`;
    
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add auth interceptor
    this.client.interceptors.request.use((config) => {
      if (this.config.oauthToken) {
        config.headers.Authorization = `Bearer ${this.config.oauthToken}`;
      } else if (this.config.username && this.config.password) {
        const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
        config.headers.Authorization = `Basic ${auth}`;
      }
      return config;
    });
  }

  /**
   * Create a new incident
   */
  async createIncident(incident: Omit<Incident, 'number' | 'sys_id'>): Promise<Incident> {
    const response = await this.client.post('/incident', incident);
    return response.data.result;
  }

  /**
   * Update an existing incident
   */
  async updateIncident(
    numberOrSysId: string,
    updates: Partial<Incident>
  ): Promise<Incident> {
    // Determine if this is a number or sys_id
    const isNumber = numberOrSysId.startsWith('INC');
    const endpoint = isNumber
      ? `/incident?sysparm_query=number=${numberOrSysId}`
      : `/incident/${numberOrSysId}`;
    
    if (isNumber) {
      // Need to get sys_id first
      const queryResponse = await this.client.get(endpoint);
      const sysId = queryResponse.data.result[0]?.sys_id;
      if (!sysId) throw new Error(`Incident ${numberOrSysId} not found`);
      
      const response = await this.client.patch(`/incident/${sysId}`, updates);
      return response.data.result;
    } else {
      const response = await this.client.patch(endpoint, updates);
      return response.data.result;
    }
  }

  /**
   * Get an incident by number or sys_id
   */
  async getIncident(numberOrSysId: string): Promise<Incident | null> {
    const isNumber = numberOrSysId.startsWith('INC');
    const endpoint = isNumber
      ? `/incident?sysparm_query=number=${numberOrSysId}`
      : `/incident/${numberOrSysId}`;
    
    const response = await this.client.get(endpoint);
    const result = isNumber ? response.data.result[0] : response.data.result;
    return result || null;
  }

  /**
   * Query incidents
   */
  async queryIncidents(query: {
    assignedTo?: string;
    assignmentGroup?: string;
    state?: number | number[];
    severity?: number | number[];
    limit?: number;
  }): Promise<Incident[]> {
    const queryParts: string[] = [];
    
    if (query.assignedTo) {
      queryParts.push(`assigned_to.user_name=${query.assignedTo}`);
    }
    if (query.assignmentGroup) {
      queryParts.push(`assignment_group.name=${query.assignmentGroup}`);
    }
    if (query.state !== undefined) {
      const states = Array.isArray(query.state) ? query.state : [query.state];
      queryParts.push(`stateIN${states.join(',')}`);
    }
    if (query.severity !== undefined) {
      const severities = Array.isArray(query.severity) ? query.severity : [query.severity];
      queryParts.push(`severityIN${severities.join(',')}`);
    }
    
    const params: Record<string, string> = {};
    if (queryParts.length > 0) {
      params.sysparm_query = queryParts.join('^');
    }
    if (query.limit) {
      params.sysparm_limit = query.limit.toString();
    }
    
    const response = await this.client.get('/incident', { params });
    return response.data.result;
  }

  /**
   * Create a change request
   */
  async createChangeRequest(change: Omit<ChangeRequest, 'number' | 'sys_id'>): Promise<ChangeRequest> {
    const response = await this.client.post('/change_request', change);
    return response.data.result;
  }

  /**
   * Add work note to incident
   */
  async addWorkNote(incidentNumber: string, note: string): Promise<void> {
    await this.updateIncident(incidentNumber, { work_notes: note });
  }
}

/**
 * Moltbot Tool Definitions
 */
export const tools = {
  servicenow_create_incident: {
    name: 'servicenow_create_incident',
    description: 'Create a new incident in ServiceNow',
    input_schema: {
      type: 'object',
      properties: {
        short_description: {
          type: 'string',
          description: 'Brief description of the incident',
        },
        description: {
          type: 'string',
          description: 'Detailed description of the incident',
        },
        severity: {
          type: 'number',
          enum: [1, 2, 3, 4],
          description: 'Severity level (1=Critical, 2=High, 3=Moderate, 4=Low)',
        },
        assignment_group: {
          type: 'string',
          description: 'Assignment group name',
        },
      },
      required: ['short_description'],
    },
  },
  
  servicenow_update_incident: {
    name: 'servicenow_update_incident',
    description: 'Update an existing incident in ServiceNow',
    input_schema: {
      type: 'object',
      properties: {
        incident_number: {
          type: 'string',
          description: 'Incident number (e.g., INC0012345)',
        },
        state: {
          type: 'number',
          description: 'New state (1=New, 2=InProgress, 3=OnHold, 6=Resolved, 7=Closed)',
        },
        work_notes: {
          type: 'string',
          description: 'Work notes to add',
        },
        assigned_to: {
          type: 'string',
          description: 'Username to assign to',
        },
      },
      required: ['incident_number'],
    },
  },
  
  servicenow_query: {
    name: 'servicenow_query',
    description: 'Query incidents from ServiceNow',
    input_schema: {
      type: 'object',
      properties: {
        assigned_to: {
          type: 'string',
          description: 'Filter by assigned user',
        },
        assignment_group: {
          type: 'string',
          description: 'Filter by assignment group',
        },
        state: {
          type: 'string',
          enum: ['open', 'in_progress', 'resolved', 'all'],
          description: 'Filter by state',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return',
        },
      },
    },
  },
  
  servicenow_create_change: {
    name: 'servicenow_create_change',
    description: 'Create a change request in ServiceNow',
    input_schema: {
      type: 'object',
      properties: {
        short_description: {
          type: 'string',
          description: 'Brief description of the change',
        },
        description: {
          type: 'string',
          description: 'Detailed description of the change',
        },
        type: {
          type: 'string',
          enum: ['standard', 'normal', 'emergency'],
          description: 'Change type',
        },
        risk: {
          type: 'string',
          enum: ['low', 'moderate', 'high'],
          description: 'Risk level',
        },
        start_date: {
          type: 'string',
          description: 'Planned start date (ISO format)',
        },
        end_date: {
          type: 'string',
          description: 'Planned end date (ISO format)',
        },
      },
      required: ['short_description'],
    },
  },
};

/**
 * Plugin entry point for Moltbot
 */
export function activate(context: { config: ServiceNowConfig }) {
  const client = new ServiceNowClient(context.config);
  
  return {
    tools,
    handlers: {
      servicenow_create_incident: async (input: any) => {
        const incident = await client.createIncident(input);
        return {
          success: true,
          incident_number: incident.number,
          message: `Created incident ${incident.number}`,
        };
      },
      
      servicenow_update_incident: async (input: any) => {
        const { incident_number, ...updates } = input;
        const incident = await client.updateIncident(incident_number, updates);
        return {
          success: true,
          incident_number: incident.number,
          message: `Updated incident ${incident.number}`,
        };
      },
      
      servicenow_query: async (input: any) => {
        const stateMap: Record<string, number[]> = {
          open: [1],
          in_progress: [2],
          resolved: [6],
          all: [1, 2, 3, 6, 7],
        };
        
        const query = {
          assignedTo: input.assigned_to,
          assignmentGroup: input.assignment_group,
          state: input.state ? stateMap[input.state] : undefined,
          limit: input.limit || 20,
        };
        
        const incidents = await client.queryIncidents(query);
        return {
          success: true,
          count: incidents.length,
          incidents: incidents.map(i => ({
            number: i.number,
            short_description: i.short_description,
            severity: i.severity,
            state: i.state,
            assigned_to: i.assigned_to,
          })),
        };
      },
      
      servicenow_create_change: async (input: any) => {
        const change = await client.createChangeRequest(input);
        return {
          success: true,
          change_number: change.number,
          message: `Created change request ${change.number}`,
        };
      },
    },
  };
}

export default { activate, tools };
