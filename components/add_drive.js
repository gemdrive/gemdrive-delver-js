import { Button } from './common.js';


export const AddDrive = (drives) => {
  const dom = document.createElement('div');
  dom.classList.add('gemdrive-delver-add-drive');

  const promptEl = document.createElement('span');
  promptEl.innerText = "Drive URL:";
  dom.appendChild(promptEl);

  let addr = '';
  const textInputEl = document.createElement('input');
  textInputEl.setAttribute('type', 'text');
  textInputEl.addEventListener('keyup', (e) => {
    addr = e.target.value;
  });
  dom.appendChild(textInputEl);

  const addBtnEl = Button("Add");
  addBtnEl.addEventListener('click', (e) => {
    dom.dispatchEvent(new CustomEvent('add-drive', {
      bubbles: true,
      detail: {
        url: addr,
      },
    }));
  });
  dom.appendChild(addBtnEl);

  const cancelBtnEl = Button("Cancel");
  cancelBtnEl.addEventListener('click', () => {
    dom.dispatchEvent(new CustomEvent('cancel-add-drive', {
      bubbles: true,
    }));
  });
  dom.appendChild(cancelBtnEl);

  return dom;
};
