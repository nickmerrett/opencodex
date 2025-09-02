# IBM watsonx.ai Provider Configuration

This document explains how to configure and use IBM watsonx.ai as a model provider in OpenCode.

## Prerequisites

1. An IBM Cloud account
2. Access to IBM watsonx.ai service
3. API key and Project ID from your IBM watsonx.ai instance

## Environment Variables

Set the following environment variables:

```bash
export WATSONX_APIKEY="your-ibm-api-key"
export WATSONX_PROJECT_ID="your-project-id"
```

Alternatively, you can use:
```bash
export IBM_WATSONX_APIKEY="your-ibm-api-key"
export IBM_WATSONX_PROJECT_ID="your-project-id"
```

## Configuration

Add IBM watsonx.ai to your OpenCode configuration file (`~/.config/opencode/config.json`):

```json
{
  "provider": {
    "ibm-watsonx": {
      "name": "IBM watsonx.ai",
      "npm": "@ai-sdk/ibm-watsonx",
      "api": "https://us-south.ml.cloud.ibm.com",
      "env": ["WATSONX_APIKEY", "IBM_WATSONX_APIKEY"],
      "models": {
        "ibm/granite-13b-chat-v2": {
          "name": "Granite 13B Chat v2",
          "release_date": "2024-10-01",
          "attachment": false,
          "reasoning": false,
          "temperature": true,
          "tool_call": true,
          "cost": {
            "input": 0.0001,
            "output": 0.0002,
            "cache_read": 0.00005,
            "cache_write": 0.00005
          },
          "limit": {
            "context": 8192,
            "output": 4096
          }
        },
        "ibm/granite-13b-instruct-v2": {
          "name": "Granite 13B Instruct v2",
          "release_date": "2024-10-01",
          "attachment": false,
          "reasoning": false,
          "temperature": true,
          "tool_call": true,
          "cost": {
            "input": 0.0001,
            "output": 0.0002,
            "cache_read": 0.00005,
            "cache_write": 0.00005
          },
          "limit": {
            "context": 8192,
            "output": 4096
          }
        },
        "meta-llama/llama-3-2-1b-instruct": {
          "name": "Llama 3.2 1B Instruct",
          "release_date": "2024-09-25",
          "attachment": false,
          "reasoning": false,
          "temperature": true,
          "tool_call": true,
          "cost": {
            "input": 0.0001,
            "output": 0.0001,
            "cache_read": 0.00005,
            "cache_write": 0.00005
          },
          "limit": {
            "context": 4096,
            "output": 2048
          }
        },
        "meta-llama/llama-3-2-3b-instruct": {
          "name": "Llama 3.2 3B Instruct",
          "release_date": "2024-09-25",
          "attachment": false,
          "reasoning": false,
          "temperature": true,
          "tool_call": true,
          "cost": {
            "input": 0.0002,
            "output": 0.0003,
            "cache_read": 0.00005,
            "cache_write": 0.00005
          },
          "limit": {
            "context": 4096,
            "output": 2048
          }
        }
      }
    }
  }
}
```

## Usage

Once configured, you can use IBM watsonx.ai models:

```bash
# List available models
opencode models

# Use a specific IBM watsonx.ai model
opencode --model ibm-watsonx/ibm/granite-13b-chat-v2

# Use in interactive mode
opencode
# Then use: /model ibm-watsonx/ibm/granite-13b-chat-v2
```

## Getting Your API Key and Project ID

1. **API Key**:
   - Go to the IBM Cloud dashboard
   - Navigate to "Manage" > "Access (IAM)" > "API keys"
   - Create a new API key or use an existing one

2. **Project ID**:
   - Go to IBM watsonx.ai
   - Open your project
   - Find the Project ID in the project settings or URL

## Supported Models

The configuration above includes some common IBM watsonx.ai models, but you can add any model available in your IBM watsonx.ai instance. Check the IBM watsonx.ai documentation for the complete list of available models.

## Troubleshooting

1. **Authentication Issues**: Ensure your API key has the necessary permissions for watsonx.ai
2. **Project Access**: Make sure your API key has access to the specified project
3. **Model Availability**: Verify that the models are available in your specific IBM watsonx.ai instance and region

## Regional Endpoints

The default endpoint is for the US South region. If your watsonx.ai instance is in a different region, update the `api` field in the configuration:

- US South: `https://us-south.ml.cloud.ibm.com`
- EU Germany: `https://eu-de.ml.cloud.ibm.com`
- Japan Tokyo: `https://jp-tok.ml.cloud.ibm.com`