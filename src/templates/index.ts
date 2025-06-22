//@ts-ignore
import baseTemplate from "./base.html?raw";
//@ts-ignore
import plainTemplate from "./plain.html?raw";
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
//@ts-ignore
import promiseTemplate from "./promise.html?raw";

function buildTemplate(template: string, replacements: Record<string, string>) {
    const content = template.replace(/{{ ?(\w+) ?}}/g, (_, key) => key in replacements ? replacements[key] : "");
    return baseTemplate.replace(/{{ ?slot ?}}/g, content.trim());
}

export {
    buildTemplate,
    plainTemplate,
    descriptionTemplate,
    successTemplate,
    infoTemplate,
    warningTemplate,
    errorTemplate,
    promiseTemplate
};
