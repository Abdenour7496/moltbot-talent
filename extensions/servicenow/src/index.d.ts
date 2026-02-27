/**
 * ServiceNow Integration for Moltbot Talent
 *
 * Provides incident and change management capabilities through ServiceNow's REST API.
 */
import { z } from 'zod';
declare const ServiceNowConfigSchema: z.ZodObject<{
    instance: z.ZodString;
    username: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    oauthClientId: z.ZodOptional<z.ZodString>;
    oauthClientSecret: z.ZodOptional<z.ZodString>;
    oauthToken: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    instance: string;
    username?: string | undefined;
    password?: string | undefined;
    oauthClientId?: string | undefined;
    oauthClientSecret?: string | undefined;
    oauthToken?: string | undefined;
}, {
    instance: string;
    username?: string | undefined;
    password?: string | undefined;
    oauthClientId?: string | undefined;
    oauthClientSecret?: string | undefined;
    oauthToken?: string | undefined;
}>;
export type ServiceNowConfig = z.infer<typeof ServiceNowConfigSchema>;
declare const IncidentSchema: z.ZodObject<{
    number: z.ZodOptional<z.ZodString>;
    sys_id: z.ZodOptional<z.ZodString>;
    short_description: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    severity: z.ZodDefault<z.ZodNumber>;
    urgency: z.ZodDefault<z.ZodNumber>;
    impact: z.ZodDefault<z.ZodNumber>;
    assignment_group: z.ZodOptional<z.ZodString>;
    assigned_to: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodNumber>;
    work_notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    short_description: string;
    severity: number;
    urgency: number;
    impact: number;
    number?: string | undefined;
    sys_id?: string | undefined;
    description?: string | undefined;
    assignment_group?: string | undefined;
    assigned_to?: string | undefined;
    state?: number | undefined;
    work_notes?: string | undefined;
}, {
    short_description: string;
    number?: string | undefined;
    sys_id?: string | undefined;
    description?: string | undefined;
    severity?: number | undefined;
    urgency?: number | undefined;
    impact?: number | undefined;
    assignment_group?: string | undefined;
    assigned_to?: string | undefined;
    state?: number | undefined;
    work_notes?: string | undefined;
}>;
export type Incident = z.infer<typeof IncidentSchema>;
declare const ChangeRequestSchema: z.ZodObject<{
    number: z.ZodOptional<z.ZodString>;
    sys_id: z.ZodOptional<z.ZodString>;
    short_description: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodDefault<z.ZodEnum<["standard", "normal", "emergency"]>>;
    risk: z.ZodDefault<z.ZodEnum<["low", "moderate", "high"]>>;
    assignment_group: z.ZodOptional<z.ZodString>;
    start_date: z.ZodOptional<z.ZodString>;
    end_date: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "standard" | "normal" | "emergency";
    short_description: string;
    risk: "low" | "moderate" | "high";
    number?: string | undefined;
    sys_id?: string | undefined;
    description?: string | undefined;
    assignment_group?: string | undefined;
    start_date?: string | undefined;
    end_date?: string | undefined;
}, {
    short_description: string;
    number?: string | undefined;
    type?: "standard" | "normal" | "emergency" | undefined;
    sys_id?: string | undefined;
    description?: string | undefined;
    assignment_group?: string | undefined;
    risk?: "low" | "moderate" | "high" | undefined;
    start_date?: string | undefined;
    end_date?: string | undefined;
}>;
export type ChangeRequest = z.infer<typeof ChangeRequestSchema>;
/**
 * ServiceNow Client
 */
export declare class ServiceNowClient {
    private client;
    private config;
    constructor(config: ServiceNowConfig);
    /**
     * Create a new incident
     */
    createIncident(incident: Omit<Incident, 'number' | 'sys_id'>): Promise<Incident>;
    /**
     * Update an existing incident
     */
    updateIncident(numberOrSysId: string, updates: Partial<Incident>): Promise<Incident>;
    /**
     * Get an incident by number or sys_id
     */
    getIncident(numberOrSysId: string): Promise<Incident | null>;
    /**
     * Query incidents
     */
    queryIncidents(query: {
        assignedTo?: string;
        assignmentGroup?: string;
        state?: number | number[];
        severity?: number | number[];
        limit?: number;
    }): Promise<Incident[]>;
    /**
     * Create a change request
     */
    createChangeRequest(change: Omit<ChangeRequest, 'number' | 'sys_id'>): Promise<ChangeRequest>;
    /**
     * Add work note to incident
     */
    addWorkNote(incidentNumber: string, note: string): Promise<void>;
}
/**
 * Moltbot Tool Definitions
 */
export declare const tools: {
    servicenow_create_incident: {
        name: string;
        description: string;
        input_schema: {
            type: string;
            properties: {
                short_description: {
                    type: string;
                    description: string;
                };
                description: {
                    type: string;
                    description: string;
                };
                severity: {
                    type: string;
                    enum: number[];
                    description: string;
                };
                assignment_group: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
    };
    servicenow_update_incident: {
        name: string;
        description: string;
        input_schema: {
            type: string;
            properties: {
                incident_number: {
                    type: string;
                    description: string;
                };
                state: {
                    type: string;
                    description: string;
                };
                work_notes: {
                    type: string;
                    description: string;
                };
                assigned_to: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
    };
    servicenow_query: {
        name: string;
        description: string;
        input_schema: {
            type: string;
            properties: {
                assigned_to: {
                    type: string;
                    description: string;
                };
                assignment_group: {
                    type: string;
                    description: string;
                };
                state: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                limit: {
                    type: string;
                    description: string;
                };
            };
        };
    };
    servicenow_create_change: {
        name: string;
        description: string;
        input_schema: {
            type: string;
            properties: {
                short_description: {
                    type: string;
                    description: string;
                };
                description: {
                    type: string;
                    description: string;
                };
                type: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                risk: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                start_date: {
                    type: string;
                    description: string;
                };
                end_date: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
    };
};
/**
 * Plugin entry point for Moltbot
 */
export declare function activate(context: {
    config: ServiceNowConfig;
}): {
    tools: {
        servicenow_create_incident: {
            name: string;
            description: string;
            input_schema: {
                type: string;
                properties: {
                    short_description: {
                        type: string;
                        description: string;
                    };
                    description: {
                        type: string;
                        description: string;
                    };
                    severity: {
                        type: string;
                        enum: number[];
                        description: string;
                    };
                    assignment_group: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
            };
        };
        servicenow_update_incident: {
            name: string;
            description: string;
            input_schema: {
                type: string;
                properties: {
                    incident_number: {
                        type: string;
                        description: string;
                    };
                    state: {
                        type: string;
                        description: string;
                    };
                    work_notes: {
                        type: string;
                        description: string;
                    };
                    assigned_to: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
            };
        };
        servicenow_query: {
            name: string;
            description: string;
            input_schema: {
                type: string;
                properties: {
                    assigned_to: {
                        type: string;
                        description: string;
                    };
                    assignment_group: {
                        type: string;
                        description: string;
                    };
                    state: {
                        type: string;
                        enum: string[];
                        description: string;
                    };
                    limit: {
                        type: string;
                        description: string;
                    };
                };
            };
        };
        servicenow_create_change: {
            name: string;
            description: string;
            input_schema: {
                type: string;
                properties: {
                    short_description: {
                        type: string;
                        description: string;
                    };
                    description: {
                        type: string;
                        description: string;
                    };
                    type: {
                        type: string;
                        enum: string[];
                        description: string;
                    };
                    risk: {
                        type: string;
                        enum: string[];
                        description: string;
                    };
                    start_date: {
                        type: string;
                        description: string;
                    };
                    end_date: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
            };
        };
    };
    handlers: {
        servicenow_create_incident: (input: any) => Promise<{
            success: boolean;
            incident_number: string | undefined;
            message: string;
        }>;
        servicenow_update_incident: (input: any) => Promise<{
            success: boolean;
            incident_number: string | undefined;
            message: string;
        }>;
        servicenow_query: (input: any) => Promise<{
            success: boolean;
            count: number;
            incidents: {
                number: string | undefined;
                short_description: string;
                severity: number;
                state: number | undefined;
                assigned_to: string | undefined;
            }[];
        }>;
        servicenow_create_change: (input: any) => Promise<{
            success: boolean;
            change_number: string | undefined;
            message: string;
        }>;
    };
};
declare const _default: {
    activate: typeof activate;
    tools: {
        servicenow_create_incident: {
            name: string;
            description: string;
            input_schema: {
                type: string;
                properties: {
                    short_description: {
                        type: string;
                        description: string;
                    };
                    description: {
                        type: string;
                        description: string;
                    };
                    severity: {
                        type: string;
                        enum: number[];
                        description: string;
                    };
                    assignment_group: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
            };
        };
        servicenow_update_incident: {
            name: string;
            description: string;
            input_schema: {
                type: string;
                properties: {
                    incident_number: {
                        type: string;
                        description: string;
                    };
                    state: {
                        type: string;
                        description: string;
                    };
                    work_notes: {
                        type: string;
                        description: string;
                    };
                    assigned_to: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
            };
        };
        servicenow_query: {
            name: string;
            description: string;
            input_schema: {
                type: string;
                properties: {
                    assigned_to: {
                        type: string;
                        description: string;
                    };
                    assignment_group: {
                        type: string;
                        description: string;
                    };
                    state: {
                        type: string;
                        enum: string[];
                        description: string;
                    };
                    limit: {
                        type: string;
                        description: string;
                    };
                };
            };
        };
        servicenow_create_change: {
            name: string;
            description: string;
            input_schema: {
                type: string;
                properties: {
                    short_description: {
                        type: string;
                        description: string;
                    };
                    description: {
                        type: string;
                        description: string;
                    };
                    type: {
                        type: string;
                        enum: string[];
                        description: string;
                    };
                    risk: {
                        type: string;
                        enum: string[];
                        description: string;
                    };
                    start_date: {
                        type: string;
                        description: string;
                    };
                    end_date: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
            };
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map