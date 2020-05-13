export const AddFilesystem = (filesystems) => {
  const dom = document.createElement('div');
  dom.classList.add('remfs-delver-add-filesystem');

  const promptEl = document.createElement('span');
  promptEl.innerText = "Filesystem URL:";
  dom.appendChild(promptEl);

  let addr = '';
  const textInputEl = document.createElement('input');
  textInputEl.setAttribute('type', 'text');
  textInputEl.addEventListener('keyup', (e) => {
    addr = e.target.value;
  });
  dom.appendChild(textInputEl);

  const addBtnEl = document.createElement('button');
  addBtnEl.innerText = "Add";
  addBtnEl.addEventListener('click', (e) => {
    dom.dispatchEvent(new CustomEvent('add-filesystem', {
      bubbles: true,
      detail: {
        url: addr,
      },
    }));
  });
  dom.appendChild(addBtnEl);

  const cancelBtnEl = document.createElement('button');
  cancelBtnEl.innerText = "Cancel";
  cancelBtnEl.addEventListener('click', () => {
    dom.dispatchEvent(new CustomEvent('cancel-add-filesystem', {
      bubbles: true,
    }));
  });
  dom.appendChild(cancelBtnEl);

  return dom;
};
