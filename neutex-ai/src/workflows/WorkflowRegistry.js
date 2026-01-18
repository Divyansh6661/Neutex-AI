// workflows/WorkflowRegistry.js
import { NewsDigestWorkflow } from './NewsDigestWorkflow';

// Registry for all automation workflows
export const WorkflowRegistry = {
  // Email Automations
  'news-digest': NewsDigestWorkflow,
  
  // Future workflows can be added here:
  // 'invoice-reminder': InvoiceReminderWorkflow,
  // 'social-media-scheduler': SocialMediaWorkflow,
  // 'backup-notification': BackupWorkflow,
  // 'crm-sync': CRMSyncWorkflow,
  // etc...
};

// Workflow categories for organization
export const WorkflowCategories = {
  'email': {
    name: 'Email Automation',
    description: 'Automated email workflows and notifications',
    icon: 'Mail',
    workflows: ['news-digest']
  },
  'social': {
    name: 'Social Media',
    description: 'Social media posting and engagement automation',
    icon: 'Share2',
    workflows: []
  },
  'data': {
    name: 'Data Processing',
    description: 'Data synchronization and processing workflows',
    icon: 'Database',
    workflows: []
  },
  'notifications': {
    name: 'Notifications',
    description: 'Alert and notification workflows',
    icon: 'Bell',
    workflows: []
  },
  'backup': {
    name: 'Backup & Sync',
    description: 'Backup and synchronization automations',
    icon: 'Download',
    workflows: []
  }
};

// Workflow manager utility functions
export class WorkflowManager {
  
  // Get all available workflows
  static getAllWorkflows() {
    return Object.values(WorkflowRegistry);
  }
  
  // Get workflow by ID
  static getWorkflow(id) {
    return WorkflowRegistry[id];
  }
  
  // Get workflows by category
  static getWorkflowsByCategory(category) {
    const categoryData = WorkflowCategories[category];
    if (!categoryData) return [];
    
    return categoryData.workflows.map(id => WorkflowRegistry[id]).filter(Boolean);
  }
  
  // Search workflows by name or description
  static searchWorkflows(query) {
    const lowerQuery = query.toLowerCase();
    return this.getAllWorkflows().filter(workflow =>
      workflow.name.toLowerCase().includes(lowerQuery) ||
      workflow.description.toLowerCase().includes(lowerQuery)
    );
  }
  
  // Export workflow as JSON
  static exportWorkflow(id) {
    const workflow = this.getWorkflow(id);
    if (!workflow) return null;
    
    return {
      exported: new Date().toISOString(),
      workflow: workflow,
      n8nData: workflow.n8nData
    };
  }
  
  // Import and validate n8n workflow
  static importN8nWorkflow(n8nData) {
    try {
      // Basic validation
      if (!n8nData.nodes || !Array.isArray(n8nData.nodes)) {
        throw new Error('Invalid n8n workflow: missing or invalid nodes array');
      }
      
      if (!n8nData.connections || typeof n8nData.connections !== 'object') {
        throw new Error('Invalid n8n workflow: missing or invalid connections object');
      }
      
      // Extract workflow information
      const nodeTypes = n8nData.nodes.map(node => 
        node.type.replace('n8n-nodes-base.', '')
      );
      
      const uniqueNodeTypes = [...new Set(nodeTypes)];
      
      return {
        valid: true,
        name: n8nData.name || 'Imported Workflow',
        nodeCount: n8nData.nodes.length,
        nodeTypes: uniqueNodeTypes,
        hasWebhook: nodeTypes.includes('webhook'),
        hasEmail: nodeTypes.some(type => ['gmail', 'smtp', 'email'].includes(type.toLowerCase())),
        hasDatabase: nodeTypes.some(type => ['googleSheets', 'mysql', 'postgres', 'mongodb'].includes(type.toLowerCase())),
        hasAPI: nodeTypes.includes('httpRequest')
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
  
  // Generate workflow documentation
  static generateDocumentation(id) {
    const workflow = this.getWorkflow(id);
    if (!workflow) return null;
    
    return {
      name: workflow.name,
      description: workflow.description,
      category: workflow.category,
      setup: workflow.instructions?.setup || [],
      usage: workflow.instructions?.usage || [],
      configuration: workflow.configuration || {},
      analysis: workflow.analysis || {},
      enhancements: workflow.enhancements || []
    };
  }
}

export default WorkflowManager;