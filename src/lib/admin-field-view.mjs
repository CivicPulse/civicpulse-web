import { editableFieldValue, editPayloadField, fieldsByKind, parseEditorPayload } from './admin-fields.mjs';

/** Native labelled fields over the SAME complete JSON value used by Save/Publish. */
export function createStructuredFields({ document, container, readText, writeText, getKind, isEditable, onChange, onError }) {
  function render() {
    container.replaceChildren();
    let payload;
    try { payload = parseEditorPayload(readText()); }
    catch {
      const note = document.createElement('p');
      note.textContent = 'The complete record needs attention. Open Advanced JSON to correct it; no fields have been changed.';
      note.className = 'field-help'; container.append(note); return;
    }
    const groups = new Map();
    for (const field of fieldsByKind[getKind()] || []) {
      if (!groups.has(field.section)) {
        const group = document.createElement('fieldset'); group.className = 'field-group';
        const legend = document.createElement('legend'); legend.textContent = field.section;
        const grid = document.createElement('div'); grid.className = 'field-grid';
        group.append(legend, grid); container.append(group); groups.set(field.section, grid);
      }
      const label = document.createElement('label');
      label.className = ['multiline', 'lines'].includes(field.type) ? 'wide-field' : '';
      const title = document.createElement('span'); title.textContent = field.label; title.id = `label-${field.key}`;
      const control = document.createElement(field.type === 'boolean' ? 'select' : ['multiline', 'lines'].includes(field.type) ? 'textarea' : 'input');
      control.id = `field-${field.key}`; control.dataset.field = field.key; control.setAttribute('aria-labelledby', title.id);
      if (control.tagName === 'INPUT') control.type = 'text';
      if (field.type === 'boolean') {
        for (const [value, name] of [['unset', 'Not specified'], ['true', 'Yes'], ['false', 'No']]) {
          const option = document.createElement('option'); option.value = value; option.textContent = name; control.append(option);
        }
      }
      const view = editableFieldValue(payload, field);
      control.value = view.value; control.disabled = !view.editable || !isEditable();
      control.dataset.unsupported = String(!view.editable);
      label.append(title, control);
      if (field.help || view.reason) {
        const help = document.createElement('span'); help.className = 'field-help'; help.id = `help-${field.key}`;
        help.textContent = view.reason || field.help; control.setAttribute('aria-describedby', help.id); label.append(help);
      }
      control.addEventListener(field.type === 'boolean' ? 'change' : 'input', () => {
        if (!isEditable()) return;
        try { writeText(editPayloadField(readText(), getKind(), field.key, control.value)); onChange(); }
        catch (error) { onError(error); }
      });
      groups.get(field.section).append(label);
    }
  }
  return { render, setDisabled(disabled) { for (const control of container.querySelectorAll('[data-field]')) control.disabled = disabled || control.dataset.unsupported === 'true'; } };
}
