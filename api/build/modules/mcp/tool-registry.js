export class ToolRegistry {
    tools = new Map();
    register(tool) {
        this.tools.set(tool.name, tool);
    }
    get(toolName) {
        return this.tools.get(toolName);
    }
    list() {
        return [...this.tools.values()];
    }
}
