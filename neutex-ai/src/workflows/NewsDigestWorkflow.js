// workflows/NewsDigestWorkflow.js
export const NewsDigestWorkflow = {
  id: 'news-digest-automation',
  name: 'Personalized News Digest',
  category: 'Email Automation',
  description: 'Automated news digest that fetches personalized news based on user preferences and sends daily email summaries',
  
  // Your original n8n workflow data
  n8nData: {
    "name": "My workflow 2",
    "nodes": [
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "user-preference",
          "options": {}
        },
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2.1,
        "position": [0, 0],
        "id": "2143e571-aae5-4e68-95f3-c872fd00d134",
        "name": "Webhook",
        "webhookId": "a597bea6-a7b1-4595-b267-23d4f19ecc13"
      },
      {
        "parameters": {
          "url": "=https://newsapi.org/v2/top-headlines?category={{$json[\"preference\"]}}&apiKey=a34b7dc722f0402ba241b766b39f9464\n",
          "options": {
            "response": {
              "response": {}
            }
          }
        },
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [624, 0],
        "id": "9d52cec9-47f3-4423-aa0d-865546ac36b0",
        "name": "HTTP Request"
      },
      {
        "parameters": {
          "jsCode": "// Loop over input items and add a new field called 'myNewField' to the JSON of each one\n// Get original user data from previous node\n// Get user data from Google Sheet node\nconst prevData = $node[\"Google Sheet\"].json; // Replace \"Google Sheet\" with your actual node name\nconst userEmail = prevData.email || prevData.Email;\nconst userPreference = prevData.preference || prevData.Preference;\n\n// Get articles from HTTP Request node\nconst articles = $json.articles || [];\nconst topArticles = articles.slice(0, 3);\n\n// Build email body\nlet emailBody = `📰 Here are your top ${userPreference} news updates:\\n\\n`;\ntopArticles.forEach((article, index) => {\n  emailBody += `${index + 1}. ${article.title}\\n${article.url}\\n\\n`;\n});\n\n// Return combined data\nreturn [\n  {\n    json: {\n      email: userEmail,\n      preference: userPreference,\n      emailBody,\n      articles\n    }\n  }\n];\n"
        },
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [880, 0],
        "id": "1acf6df1-7152-4282-9e74-39379deb65b1",
        "name": "Code in JavaScript"
      },
      {
        "parameters": {
          "sendTo": "={{$json[\"email\"]}}",
          "subject": "=Your Daily {{$json[\"preference\"]}} Digest",
          "message": "={{$json[\"emailBody\"]}}",
          "options": {}
        },
        "type": "n8n-nodes-base.gmail",
        "typeVersion": 2.1,
        "position": [1120, 0],
        "id": "3b94e5c6-e806-47d0-be31-a69351fe999f",
        "name": "Send a message",
        "webhookId": "c46b502a-6ad1-4d5c-a80d-cb2e925d8787",
        "credentials": {
          "gmailOAuth2": {
            "id": "6OVcG4imyd1cAOlp",
            "name": "Gmail account"
          }
        }
      },
      {
        "parameters": {
          "assignments": {
            "assignments": [
              {
                "id": "d56ac86c-5943-4777-8241-218ff762b3cd",
                "name": "email",
                "value": "={{$json[\"Email\"]}}",
                "type": "string"
              },
              {
                "id": "b3c769af-b55d-42f8-980b-dcaddd1f1d99",
                "name": "preference",
                "value": "={{$json[\"Preference\"]}}",
                "type": "string"
              }
            ]
          },
          "options": {}
        },
        "type": "n8n-nodes-base.set",
        "typeVersion": 3.4,
        "position": [416, 0],
        "id": "ad33beac-72f1-4e93-9ffd-cfb786568b8c",
        "name": "Edit Fields1"
      },
      {
        "parameters": {
          "operation": "append",
          "documentId": {
            "__rl": true,
            "value": "1CvqH2MuVmRD2lqW5rH5ut097XwAFpyguK7YFcLCjePg",
            "mode": "id"
          },
          "sheetName": {
            "__rl": true,
            "value": "Sheet1",
            "mode": "name"
          },
          "columns": {
            "mappingMode": "defineBelow",
            "value": {
              "Email": "={{$json[\"body\"][\"email\"]}}",
              "SubscribedAt": "={{$now}}",
              "Preference": "={{$json[\"body\"][\"preference\"]}}"
            },
            "matchingColumns": [],
            "schema": [
              {
                "id": "Email",
                "displayName": "Email",
                "required": false,
                "defaultMatch": false,
                "display": true,
                "type": "string",
                "canBeUsedToMatch": true,
                "removed": false
              },
              {
                "id": "Preference",
                "displayName": "Preference",
                "required": false,
                "defaultMatch": false,
                "display": true,
                "type": "string",
                "canBeUsedToMatch": true,
                "removed": false
              },
              {
                "id": "SubscribedAt",
                "displayName": "SubscribedAt",
                "required": false,
                "defaultMatch": false,
                "display": true,
                "type": "string",
                "canBeUsedToMatch": true,
                "removed": false
              }
            ],
            "attemptToConvertTypes": false,
            "convertFieldsToString": false
          },
          "options": {}
        },
        "type": "n8n-nodes-base.googleSheets",
        "typeVersion": 4.7,
        "position": [208, 0],
        "id": "92a8ee68-3bf8-448b-b4f7-c941866f5242",
        "name": "Google Sheet",
        "credentials": {
          "googleSheetsOAuth2Api": {
            "id": "nSow3L89LBc1oKGd",
            "name": "Google Sheets account"
          }
        }
      }
    ],
    "pinData": {},
    "connections": {
      "Webhook": {
        "main": [
          [
            {
              "node": "Google Sheet",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "HTTP Request": {
        "main": [
          [
            {
              "node": "Code in JavaScript",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Code in JavaScript": {
        "main": [
          [
            {
              "node": "Send a message",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Edit Fields1": {
        "main": [
          [
            {
              "node": "HTTP Request",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Google Sheet": {
        "main": [
          [
            {
              "node": "Edit Fields1",
              "type": "main",
              "index": 0
            }
          ]
        ]
      }
    },
    "active": false,
    "settings": {
      "executionOrder": "v1"
    }
  },

  // Workflow analysis and documentation
  analysis: {
    totalNodes: 6,
    nodeTypes: [
      { type: 'Webhook', count: 1, description: 'Receives user preferences via HTTP POST' },
      { type: 'Google Sheets', count: 1, description: 'Stores user email and preferences' },
      { type: 'Set/Edit Fields', count: 1, description: 'Formats data for API call' },
      { type: 'HTTP Request', count: 1, description: 'Fetches news from NewsAPI' },
      { type: 'Code', count: 1, description: 'Processes and formats email content' },
      { type: 'Gmail', count: 1, description: 'Sends personalized email digest' }
    ],
    flow: [
      'User submits preferences via webhook',
      'Data stored in Google Sheets',
      'Fields processed and formatted',
      'News fetched from NewsAPI based on category',
      'Email content generated with top 3 articles',
      'Personalized digest sent via Gmail'
    ]
  },

  // Configuration options
  configuration: {
    required: [
      {
        name: 'NewsAPI Key',
        key: 'newsapi_key',
        type: 'string',
        description: 'API key for NewsAPI.org',
        current: 'a34b7dc722f0402ba241b766b39f9464'
      },
      {
        name: 'Google Sheets Document ID',
        key: 'sheets_doc_id',
        type: 'string',
        description: 'Google Sheets document for storing user data',
        current: '1CvqH2MuVmRD2lqW5rH5ut097XwAFpyguK7YFcLCjePg'
      }
    ],
    optional: [
      {
        name: 'Articles Count',
        key: 'articles_count',
        type: 'number',
        description: 'Number of articles to include in digest',
        default: 3,
        min: 1,
        max: 10
      },
      {
        name: 'Email Schedule',
        key: 'email_schedule',
        type: 'select',
        description: 'How often to send digest emails',
        options: ['daily', 'weekly', 'bi-weekly'],
        default: 'daily'
      }
    ]
  },

  // Usage instructions
  instructions: {
    setup: [
      'Import this workflow into your n8n instance',
      'Configure Gmail OAuth2 credentials',
      'Set up Google Sheets API access',
      'Update NewsAPI key in HTTP Request node',
      'Activate the workflow',
      'Note the webhook URL for user subscriptions'
    ],
    usage: [
      'Users can subscribe by sending POST request to webhook',
      'Required fields: email, preference (category)',
      'Workflow will automatically fetch and send news digest',
      'User data is stored in Google Sheets for management'
    ]
  },

  // Potential improvements
  enhancements: [
    'Add unsubscribe functionality',
    'Implement email templates for better formatting',
    'Add error handling and retry logic',
    'Include image thumbnails from articles',
    'Add analytics tracking for email opens',
    'Support for multiple news sources',
    'Custom scheduling per user preference'
  ]
};

export default NewsDigestWorkflow;