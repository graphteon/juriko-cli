import { ToolResult } from '../types';

interface TodoItem {
  id?: string; // Make ID optional - will be auto-generated if not provided
  content?: string; // Support both content and task for backward compatibility
  task?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

export class TodoTool {
  private todos: TodoItem[] = [];
  private nextId = 1;

  private generateId(): string {
    return `todo-${this.nextId++}`;
  }

  private getTaskContent(todo: TodoItem): string {
    return todo.content || todo.task || 'Untitled task';
  }

  formatTodoList(): string {
    if (this.todos.length === 0) {
      return 'No todos created yet';
    }

    const getCheckbox = (status: string): string => {
      switch (status) {
        case 'completed':
          return '●';
        case 'in_progress':
          return '◐';
        case 'pending':
          return '○';
        default:
          return '○';
      }
    };

    const getStatusColor = (status: string): string => {
      switch (status) {
        case 'completed':
          return '\x1b[32m'; // Green
        case 'in_progress':
          return '\x1b[36m'; // Cyan
        case 'pending':
          return '\x1b[37m'; // White/default
        default:
          return '\x1b[0m'; // Reset
      }
    };

    const reset = '\x1b[0m';
    let output = '';

    this.todos.forEach((todo, index) => {
      const checkbox = getCheckbox(todo.status);
      const statusColor = getStatusColor(todo.status);
      const strikethrough = todo.status === 'completed' ? '\x1b[9m' : '';
      const indent = index === 0 ? '' : '  ';
      
      output += `${indent}${statusColor}${strikethrough}${checkbox} ${this.getTaskContent(todo)}${reset}\n`;
    });

    return output;
  }

  async createTodoList(todos: TodoItem[]): Promise<ToolResult> {
    try {
      // Debug: Log the input todos for troubleshooting
      console.log('CreateTodo received todos:', JSON.stringify(todos, null, 2));
      
      // Process and validate todos
      const processedTodos: TodoItem[] = [];
      
      for (let i = 0; i < todos.length; i++) {
        const todo = todos[i];
        
        // Auto-generate ID if not provided
        const processedTodo: TodoItem = {
          ...todo,
          id: todo.id || this.generateId()
        };

        // Debug: Log each processed todo
        console.log(`Processing todo ${i + 1}:`, JSON.stringify(processedTodo, null, 2));

        // Validate required fields
        if (!this.getTaskContent(processedTodo)) {
          const errorMsg = `Todo ${i + 1} must have content or task field. Received: ${JSON.stringify(todo)}`;
          console.warn(errorMsg);
          return {
            success: false,
            error: errorMsg
          };
        }

        if (!processedTodo.status) {
          const errorMsg = `Todo ${i + 1} must have a status field. Received: ${JSON.stringify(todo)}`;
          console.warn(errorMsg);
          return {
            success: false,
            error: errorMsg
          };
        }

        if (!processedTodo.priority) {
          const errorMsg = `Todo ${i + 1} must have a priority field. Received: ${JSON.stringify(todo)}`;
          console.warn(errorMsg);
          return {
            success: false,
            error: errorMsg
          };
        }

        if (!['pending', 'in_progress', 'completed'].includes(processedTodo.status)) {
          const errorMsg = `Todo ${i + 1} has invalid status: ${processedTodo.status}. Must be pending, in_progress, or completed`;
          console.warn(errorMsg);
          return {
            success: false,
            error: errorMsg
          };
        }

        if (!['high', 'medium', 'low'].includes(processedTodo.priority)) {
          const errorMsg = `Todo ${i + 1} has invalid priority: ${processedTodo.priority}. Must be high, medium, or low`;
          console.warn(errorMsg);
          return {
            success: false,
            error: errorMsg
          };
        }

        processedTodos.push(processedTodo);
      }

      this.todos = processedTodos;
      console.log('Successfully created todo list with', processedTodos.length, 'todos');
      
      return {
        success: true,
        output: this.formatTodoList()
      };
    } catch (error) {
      const errorMsg = `Error creating todo list: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg, error);
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  async updateTodoList(updates: { id: string; status?: string; content?: string; task?: string; priority?: string }[]): Promise<ToolResult> {
    try {
      const updatedIds: string[] = [];

      for (const update of updates) {
        const todoIndex = this.todos.findIndex(t => t.id === update.id);
        
        if (todoIndex === -1) {
          return {
            success: false,
            error: `Todo with id ${update.id} not found`
          };
        }

        const todo = this.todos[todoIndex];

        if (update.status && !['pending', 'in_progress', 'completed'].includes(update.status)) {
          return {
            success: false,
            error: `Invalid status: ${update.status}. Must be pending, in_progress, or completed`
          };
        }

        if (update.priority && !['high', 'medium', 'low'].includes(update.priority)) {
          return {
            success: false,
            error: `Invalid priority: ${update.priority}. Must be high, medium, or low`
          };
        }

        if (update.status) todo.status = update.status as any;
        if (update.content) todo.content = update.content;
        if (update.task) todo.task = update.task;
        if (update.priority) todo.priority = update.priority as any;

        updatedIds.push(update.id);
      }

      return {
        success: true,
        output: this.formatTodoList()
      };
    } catch (error) {
      return {
        success: false,
        error: `Error updating todo list: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async viewTodoList(): Promise<ToolResult> {
    return {
      success: true,
      output: this.formatTodoList()
    };
  }
}