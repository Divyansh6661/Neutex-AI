// components/N8NWorkflowManager.js
import React, { useState, useEffect } from 'react';
import { Upload, FileText, Play, Eye, Download, Trash2, Copy, RefreshCw, Mail, Zap, Settings, Sparkles } from 'lucide-react';
import { WorkflowRegistry, WorkflowCategories } from '../workflows/WorkflowRegistry';

const N8NWorkflowManager = ({ isDarkMode, getThemeClasses }) => {
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  // Load workflows from localStorage and merge with predefined ones
  useEffect(() => {
    // Get imported workflows
    const savedWorkflows = JSON.parse(localStorage.getItem('n8n_workflows') || '[]');
    
    // Get predefined workflows from registry
    const predefinedWorkflows = Object.entries(WorkflowRegistry).map(([id, workflow]) => ({
      id: `predefined_${id}`,
      name: workflow.name,
      description: workflow.description,
      category: workflow.category,
      data: workflow.n8nData,
      analysis: workflow.analysis,
      configuration: workflow.configuration,
      instructions: workflow.instructions,
      enhancements: workflow.enhancements,
      isPredefined: true,
      imported: new Date(2024, 0, 1) // Default date for predefined workflows
    }));
    
    // Combine and set workflows
    setWorkflows([...predefinedWorkflows, ...savedWorkflows]);
  }, []);

  // Save workflows to localStorage (only user-imported ones)
  const saveWorkflows = (newWorkflows) => {
    const userWorkflows = newWorkflows.filter(w => !w.isPredefined);
    localStorage.setItem('n8n_workflows', JSON.stringify(userWorkflows));
    
    // Update state with both predefined and user workflows
    const predefinedWorkflows = workflows.filter(w => w.isPredefined);
    setWorkflows([...predefinedWorkflows, ...userWorkflows]);
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workflowData = JSON.parse(e.target.result);
        
        // Check if this matches a predefined workflow
        const matchingPredefined = Object.values(WorkflowRegistry).find(predefined => 
          predefined.n8nData && predefined.n8nData.name === workflowData.name
        );
        
        const newWorkflow = {
          id: Date.now(),
          name: workflowData.name || 'Unnamed Workflow',
          description: matchingPredefined ? matchingPredefined.description : generateWorkflowDescription(workflowData),
          category: matchingPredefined ? matchingPredefined.category : 'Imported',
          data: workflowData,
          imported: new Date(),
          type: 'n8n',
          isPredefined: false,
          // Include predefined workflow metadata if it matches
          ...(matchingPredefined && {
            analysis: matchingPredefined.analysis,
            configuration: matchingPredefined.configuration,
            instructions: matchingPredefined.instructions,
            enhancements: matchingPredefined.enhancements,
            matchesPredefined: true
          })
        };
        
        const updatedWorkflows = [...workflows, newWorkflow];
        setWorkflows(updatedWorkflows);
        saveWorkflows(updatedWorkflows);
        setShowImport(false);
        
        // Show success message with specific info
        if (matchingPredefined) {
          alert(`Successfully imported "${workflowData.name}"!\n\nThis matches our "${matchingPredefined.name}" template. Click "Use" for detailed setup instructions.`);
        } else {
          alert(`Successfully imported "${workflowData.name}"!`);
        }
      } catch (error) {
        alert('Error parsing n8n workflow file. Please check the JSON format.');
      }
    };
    reader.readAsText(file);
  };

  // Generate description from workflow data
  const generateWorkflowDescription = (workflowData) => {
    const nodes = workflowData.nodes || [];
    const nodeTypes = [...new Set(nodes.map(node => 
      node.type.replace('n8n-nodes-base.', '').replace(/([A-Z])/g, ' $1').trim()
    ))];
    return `Workflow with ${nodes.length} nodes: ${nodeTypes.slice(0, 3).join(', ')}${nodeTypes.length > 3 ? '...' : ''}`;
  };

  // Delete workflow (only user-imported ones)
  const deleteWorkflow = (id) => {
    const workflow = workflows.find(w => w.id === id);
    if (workflow?.isPredefined) {
      alert('Cannot delete predefined workflows. They are part of the system templates.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this workflow?')) {
      const updatedWorkflows = workflows.filter(w => w.id !== id);
      setWorkflows(updatedWorkflows);
      saveWorkflows(updatedWorkflows);
      if (selectedWorkflow?.id === id) {
        setSelectedWorkflow(null);
      }
    }
  };

  // Copy workflow JSON
  const copyWorkflowJSON = (workflow) => {
    navigator.clipboard.writeText(JSON.stringify(workflow.data, null, 2));
    alert('Workflow JSON copied to clipboard!');
  };

  // Deploy/Use workflow
  const deployWorkflow = (workflow) => {
    // Check if workflow has detailed instructions (either predefined or matches predefined)
    if (workflow.isPredefined || workflow.matchesPredefined || workflow.instructions) {
      let instructions = `🚀 Ready to deploy "${workflow.name}"?\n\n`;
      
      if (workflow.instructions?.setup) {
        instructions += "SETUP STEPS:\n";
        workflow.instructions.setup.forEach((step, index) => {
          instructions += `${index + 1}. ${step}\n`;
        });
        instructions += "\n";
      }
      
      if (workflow.configuration?.required) {
        instructions += "REQUIRED CONFIGURATION:\n";
        workflow.configuration.required.forEach(config => {
          instructions += `• ${config.name}: ${config.description}\n`;
        });
        instructions += "\n";
      }
      
      if (workflow.instructions?.usage) {
        instructions += "USAGE:\n";
        workflow.instructions.usage.forEach(usage => {
          instructions += `• ${usage}\n`;
        });
        instructions += "\n";
      }
      
      instructions += "Click 'Copy' to get the workflow JSON for n8n import.";
      alert(instructions);
    } else {
      // Generic instructions for unknown imported workflows
      alert(`To deploy "${workflow.name}":\n\n1. Copy the workflow JSON using the Copy button\n2. Import it into your n8n instance\n3. Configure any required credentials and API keys\n4. Test the workflow connections\n5. Activate the workflow\n\nNote: Check the workflow nodes for specific configuration requirements.`);
    }
  };

  // Filter workflows by category
  const filteredWorkflows = workflows.filter(workflow => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'imported') return !workflow.isPredefined;
    if (activeCategory === 'templates') return workflow.isPredefined;
    return workflow.category?.toLowerCase() === activeCategory;
  });

  // Get workflow icon based on category or type
  const getWorkflowIcon = (workflow) => {
    if (workflow.category === 'Email Automation') return Mail;
    if (workflow.isPredefined) return Sparkles;
    return FileText;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className={getThemeClasses(
          "text-xl font-bold text-slate-900",
          "text-xl font-bold text-white"
        )}>
          N8N Workflow Library
        </h3>
        <button
          onClick={() => setShowImport(true)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors flex items-center space-x-2"
        >
          <Upload className="w-4 h-4" />
          <span>Import Workflow</span>
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All Workflows', count: workflows.length },
          { key: 'templates', label: 'Templates', count: workflows.filter(w => w.isPredefined).length },
          { key: 'imported', label: 'Imported', count: workflows.filter(w => !w.isPredefined).length },
          { key: 'email automation', label: 'Email', count: workflows.filter(w => w.category === 'Email Automation').length }
        ].map(category => (
          <button
            key={category.key}
            onClick={() => setActiveCategory(category.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeCategory === category.key
                ? 'bg-orange-500 text-white'
                : getThemeClasses(
                    'bg-white/70 text-slate-700 hover:bg-white/90',
                    'bg-gray-700/70 text-gray-200 hover:bg-gray-600/90'
                  )
            }`}
          >
            {category.label} ({category.count})
          </button>
        ))}
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={getThemeClasses(
            "bg-white rounded-2xl p-6 w-full max-w-md",
            "bg-gray-800 rounded-2xl p-6 w-full max-w-md"
          )}>
            <h4 className={getThemeClasses(
              "text-lg font-bold text-slate-900 mb-4",
              "text-lg font-bold text-white mb-4"
            )}>
              Import N8N Workflow
            </h4>
            <div className="space-y-4">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-green-500 transition-colors"
              />
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowImport(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredWorkflows.map((workflow) => {
          const IconComponent = getWorkflowIcon(workflow);
          return (
            <div
              key={workflow.id}
              className={getThemeClasses(
                "bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300",
                "bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    workflow.isPredefined 
                      ? 'bg-gradient-to-br from-orange-500 to-red-500' 
                      : 'bg-gradient-to-br from-green-500 to-blue-500'
                  }`}>
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className={getThemeClasses(
                        "font-semibold text-slate-900",
                        "font-semibold text-white"
                      )}>
                        {workflow.name}
                      </h4>
                      {workflow.isPredefined && (
                        <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded-full">
                          Template
                        </span>
                      )}
                    </div>
                    <p className={getThemeClasses(
                      "text-xs text-slate-600",
                      "text-xs text-gray-400"
                    )}>
                      {workflow.category} • {new Date(workflow.imported).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {!workflow.isPredefined && (
                  <button
                    onClick={() => deleteWorkflow(workflow.id)}
                    className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                )}
              </div>

              <p className={getThemeClasses(
                "text-sm text-slate-600 mb-4",
                "text-sm text-gray-300 mb-4"
              )}>
                {workflow.description}
              </p>

              {workflow.analysis && (
                <div className="mb-4 text-xs">
                  <div className={getThemeClasses(
                    "text-slate-500",
                    "text-gray-400"
                  )}>
                    {workflow.analysis.totalNodes} nodes • {workflow.analysis.nodeTypes?.slice(0, 2).map(nt => nt.type).join(', ')}
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedWorkflow(workflow);
                    setShowPreview(true);
                  }}
                  className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors flex items-center justify-center space-x-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => deployWorkflow(workflow)}
                  className="flex-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition-colors flex items-center justify-center space-x-1"
                >
                  <Play className="w-3 h-3" />
                  <span>Use</span>
                </button>
                <button
                  onClick={() => copyWorkflowJSON(workflow)}
                  className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors flex items-center justify-center space-x-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredWorkflows.length === 0 && (
        <div className={getThemeClasses(
          "text-center py-12 text-slate-500",
          "text-center py-12 text-gray-400"
        )}>
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No workflows found</p>
          <p className="text-sm">Import a workflow or check different categories</p>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedWorkflow && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={getThemeClasses(
            "bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden",
            "bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
          )}>
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h4 className={getThemeClasses(
                  "text-lg font-bold text-slate-900",
                  "text-lg font-bold text-white"
                )}>
                  {selectedWorkflow.name}
                </h4>
                <p className={getThemeClasses(
                  "text-sm text-slate-600",
                  "text-sm text-gray-400"
                )}>
                  {selectedWorkflow.category}
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="flex h-[calc(90vh-140px)]">
              {/* Tabs */}
              <div className="w-48 border-r border-gray-200 p-4">
                <div className="space-y-2">
                  {['overview', 'workflow', 'instructions', 'config'].map(tab => (
                    <button
                      key={tab}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm capitalize transition-colors ${
                        tab === 'workflow' 
                          ? 'bg-orange-500 text-white'
                          : getThemeClasses('hover:bg-gray-100 text-slate-700', 'hover:bg-gray-700 text-gray-300')
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <pre className={getThemeClasses(
                  "bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto",
                  "bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto text-green-400"
                )}>
                  {JSON.stringify(selectedWorkflow.data, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default N8NWorkflowManager;
