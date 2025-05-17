//@ts-ignore
import descriptionTemplate from "./description.html?raw";

function buildTemplate(template: string, replacements: Record<string, string>) {
    return template.replace(/{{(\w+)}}/g, (_, key) => replacements[key]);
}

export { descriptionTemplate, buildTemplate };