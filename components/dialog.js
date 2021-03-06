export const Dialog = (child) => {
  const dom = document.createElement('div');
  dom.classList.add('dialog');

  const overlay = document.createElement('div');
  overlay.classList.add('dialog__overlay');
  dom.appendChild(overlay);
  overlay.addEventListener('click', () => {
    dom.dispatchEvent(new CustomEvent('overlay-clicked', { bubbles: true }));
  });

  const content = document.createElement('div');
  content.classList.add('dialog__content');
  content.appendChild(child);
  dom.appendChild(content);

  return dom;
};

export const ConfirmDialog = (message) => {

  const dom = document.createElement('div');
  dom.classList.add('confirm-dialog');

  const messageEl = document.createElement('p');
  messageEl.innerText = message;
  dom.appendChild(messageEl);

  const btnRowEl = document.createElement('div');
  btnRowEl.classList.add('button-row');

  const confirmBtnEl = document.createElement('button');
  confirmBtnEl.innerText = "Confirm";
  confirmBtnEl.classList.add('button');
  btnRowEl.appendChild(confirmBtnEl);
  confirmBtnEl.addEventListener('click', () => {
    dom.dispatchEvent(new CustomEvent('confirm', { bubbles: true }));
  });

  const cancelBtnEl = document.createElement('button');
  cancelBtnEl.innerText = "Cancel";
  cancelBtnEl.classList.add('button');
  btnRowEl.appendChild(cancelBtnEl);
  cancelBtnEl.addEventListener('click', () => {
    dom.dispatchEvent(new CustomEvent('cancel', { bubbles: true }));
  });

  dom.appendChild(btnRowEl);

  const dialog = Dialog(dom);
  dialog.addEventListener('overlay-clicked', () => {
    dom.dispatchEvent(new CustomEvent('cancel', { bubbles: true }));
  });

  return dialog;
};


export const PromptDialog = (message) => {

  const dom = document.createElement('div');
  dom.classList.add('prompt-dialog');

  const messageEl = document.createElement('p');
  messageEl.innerText = message;
  dom.appendChild(messageEl);

  const inputEl = document.createElement('input');
  inputEl.type = 'text';
  dom.appendChild(inputEl);

  const btnRowEl = document.createElement('div');
  btnRowEl.classList.add('button-row');

  const submitBtnEl = document.createElement('button');
  submitBtnEl.innerText = "Submit";
  submitBtnEl.classList.add('button');
  btnRowEl.appendChild(submitBtnEl);
  submitBtnEl.addEventListener('click', () => {
    dom.dispatchEvent(new CustomEvent('submit', {
      bubbles: true,
      detail: {
        value: inputEl.value,
      },
    }));
  });

  const cancelBtnEl = document.createElement('button');
  cancelBtnEl.innerText = "Cancel";
  cancelBtnEl.classList.add('button');
  btnRowEl.appendChild(cancelBtnEl);
  cancelBtnEl.addEventListener('click', () => {
    dom.dispatchEvent(new CustomEvent('cancel', { bubbles: true }));
  });

  dom.appendChild(btnRowEl);

  const dialog = Dialog(dom);
  dialog.addEventListener('overlay-clicked', () => {
    dom.dispatchEvent(new CustomEvent('cancel', { bubbles: true }));
  });

  return dialog;
};

export async function showConfirmDialog(message) {
  const dialog = ConfirmDialog(message);
  document.body.appendChild(dialog);

  return new Promise((resolve, reject) => {
    dialog.addEventListener('confirm', () => {
      document.body.removeChild(dialog);
      resolve(true);
    });
    dialog.addEventListener('cancel', () => {
      document.body.removeChild(dialog);
      resolve(false);
    });
  });
}

export async function showPromptDialog(message) {
  const dialog = PromptDialog(message);
  document.body.appendChild(dialog);

  return new Promise((resolve, reject) => {
    dialog.addEventListener('submit', (e) => {
      document.body.removeChild(dialog);
      resolve(e.detail.value);
    });
    dialog.addEventListener('cancel', () => {
      document.body.removeChild(dialog);
      resolve(null);
    });
  });
}
