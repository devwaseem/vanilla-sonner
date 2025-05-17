//@ts-ignore
import descriptionTemplate from "./description.html?raw";
//@ts-ignore
import successTemplate from "./success.html?raw";
//@ts-ignore
import infoTemplate from "./info.html?raw";
//@ts-ignore
import warningTemplate from "./warning.html?raw";
//@ts-ignore
import errorTemplate from "./error.html?raw";

function buildTemplate(template: string, replacements: Record<string, string>) {
    return template.replace(/{{(\w+)}}/g, (_, key) => replacements[key]);
}

export {
    buildTemplate,
    descriptionTemplate,
    successTemplate,
    infoTemplate,
    warningTemplate,
    errorTemplate
};