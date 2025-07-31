/**
 * Utility functions for safely parsing tool arguments
 */

/**
 * Safely parse tool arguments, handling both string and object inputs
 * @param args - The arguments to parse (can be string or object)
 * @returns Parsed object or throws error if invalid
 */
export function safeParseArguments(args: any): any {
  // If args is already an object (and not null), return it directly
  if (typeof args === 'object' && args !== null && !Array.isArray(args)) {
    return args;
  }
  
  // If args is a string, try to parse it as JSON
  if (typeof args === 'string') {
    try {
      return JSON.parse(args);
    } catch (error) {
      throw new Error(`Invalid JSON in arguments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // If args is null or undefined, return empty object
  if (args === null || args === undefined) {
    return {};
  }
  
  // For any other type, throw an error
  throw new Error(`Invalid argument type: expected string or object, got ${typeof args}`);
}

/**
 * Safely parse tool call arguments from LLM tool calls
 * @param toolCall - The tool call object containing function.arguments
 * @returns Parsed arguments object
 */
export function parseToolCallArguments(toolCall: { function: { arguments: any } }): any {
  if (!toolCall?.function?.arguments) {
    return {};
  }
  
  return safeParseArguments(toolCall.function.arguments);
}

/**
 * Validate that arguments match expected type for object properties
 * @param args - The parsed arguments object
 * @param schema - The schema object with properties and their types
 * @returns Validation error message or null if valid
 */
export function validateArgumentTypes(args: any, schema: any): string | null {
  if (!schema || !schema.properties) {
    return null; // No validation if schema is not available
  }

  // Check required properties
  if (schema.required) {
    for (const requiredProp of schema.required) {
      if (!(requiredProp in args)) {
        return `Missing required property: ${requiredProp}`;
      }
    }
  }

  // Basic type validation for known properties
  for (const [propName, propSchema] of Object.entries(schema.properties)) {
    if (propName in args) {
      const value = args[propName];
      const propSchemaObj = propSchema as any;
      
      if (propSchemaObj.type) {
        const expectedType = propSchemaObj.type;
        const actualType = typeof value;
        
        // Simple type checking with improved object handling
        if (expectedType === 'string' && actualType !== 'string') {
          return `Property ${propName} should be a string, got ${actualType}`;
        }
        if (expectedType === 'number') {
          // Check if it's already a number
          if (actualType === 'number') {
            // It's already a valid number, continue
            continue;
          }
          // If it's a string, try to convert it to number
          if (actualType === 'string') {
            const numValue = Number(value);
            if (!isNaN(numValue) && isFinite(numValue)) {
              // Update the args with the converted number
              args[propName] = numValue;
              continue;
            }
          }
          return `Property ${propName} should be a number, got ${actualType}`;
        }
        if (expectedType === 'boolean') {
          // Check if it's already a boolean
          if (actualType === 'boolean') {
            // It's already a valid boolean, continue
            continue;
          }
          // If it's a string, try to convert it to boolean
          if (actualType === 'string') {
            const lowerValue = value.toLowerCase();
            if (lowerValue === 'true' || lowerValue === '1') {
              args[propName] = true;
              continue;
            } else if (lowerValue === 'false' || lowerValue === '0') {
              args[propName] = false;
              continue;
            }
          }
          // If it's a number, convert to boolean
          if (actualType === 'number') {
            args[propName] = Boolean(value);
            continue;
          }
          return `Property ${propName} should be a boolean, got ${actualType}`;
        }
        // Handle array type validation and parsing moved to later section
        if (expectedType === 'object') {
          // Check if it's already an object
          if (actualType === 'object' && value !== null && !Array.isArray(value)) {
            // It's already a valid object, continue
            continue;
          }
          // If it's a string, try to parse it
          if (actualType === 'string') {
            try {
              const parsed = JSON.parse(value);
              if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                // Update the args with the parsed object
                args[propName] = parsed;
                continue;
              }
            } catch {
              // Fall through to error
            }
          }
          return `Property ${propName} should be an object`;
        }
        if (expectedType === 'array') {
          // Check if it's already an array
          if (Array.isArray(value)) {
            // It's already a valid array, continue
            continue;
          }
          // If it's a string, try to parse it
          if (actualType === 'string') {
            try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) {
                // Update the args with the parsed array
                args[propName] = parsed;
                continue;
              }
            } catch {
              // Fall through to error
            }
          }
          return `Property ${propName} should be an array`;
        }
      }
    }
  }

  return null;
}