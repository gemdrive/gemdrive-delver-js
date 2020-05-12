import { encodePath } from '../utils.js';


export const ControlBar = () => {
  const dom = document.createElement('div');
  dom.classList.add('remfs-delver-control-bar');

  const locationEl = document.createElement('span');
  locationEl.classList.add('remfs-delver-control-bar__location');
  dom.appendChild(locationEl);

  const curFsEl = document.createElement('span');
  curFsEl.classList.add('remfs-delver-control-bar__fs-url');
  curFsEl.innerText = "[]";
  locationEl.appendChild(curFsEl);

  const curPathEl = document.createElement('span');
  curPathEl.classList.add('remfs-delver-control-bar__path');
  curPathEl.innerText = "/";
  locationEl.appendChild(curPathEl);

  const btnContainerEl = document.createElement('span');
  btnContainerEl.classList.add('remfs-delver-control-bar__buttons');
  dom.appendChild(btnContainerEl);

  const homeBtnEl = document.createElement('ion-icon');
  btnContainerEl.appendChild(homeBtnEl);
  homeBtnEl.name = 'home';
  homeBtnEl.addEventListener('click', (e) => {
    dom.dispatchEvent(new CustomEvent('go-to-your-home', {
      bubbles: true,
    }));
  });

  const uploadBtnEl = document.createElement('ion-icon');
  uploadBtnEl.name = 'cloud-upload';
  uploadBtnEl.addEventListener('click', (e) => {
    dom.dispatchEvent(new CustomEvent('upload', {
      bubbles: true,
    }));
  });
  btnContainerEl.appendChild(uploadBtnEl);

  const deleteBtnContainerEl = document.createElement('span');
  btnContainerEl.appendChild(deleteBtnContainerEl);

  const deleteBtnEl = document.createElement('ion-icon');
  deleteBtnEl.name = 'close-circle';
  deleteBtnEl.addEventListener('click', (e) => {
    dom.dispatchEvent(new CustomEvent('delete', {
      bubbles: true,
    }));
  });

  function onLocationChange(fsUrl, path) {
    curFsEl.innerText = '[' + fsUrl + ']';

    const pathStr = encodePath(path);
    curPathEl.innerText = pathStr;
  }

  function onSelectedItemsChange(selectedItems) {
    if (Object.keys(selectedItems).length === 0) {
      removeAllChildren(deleteBtnContainerEl);
    }
    else if (deleteBtnContainerEl.childNodes.length === 0) {
      deleteBtnContainerEl.appendChild(deleteBtnEl);
    }
  }

  //const listIconEl = document.createElement('ion-icon');
  //listIconEl.name = 'list';
  //listIconEl.addEventListener('click', (e) => {
  //  dom.dispatchEvent(new CustomEvent('layout-list', {
  //    bubbles: true,
  //  }));
  //});
  //dom.appendChild(listIconEl);
  //
  //const gridIconEl = document.createElement('ion-icon');
  //gridIconEl.name = 'apps';
  //gridIconEl.addEventListener('click', (e) => {
  //  dom.dispatchEvent(new CustomEvent('layout-grid', {
  //    bubbles: true,
  //  }));
  //});
  //dom.appendChild(gridIconEl);

  return { dom, onLocationChange, onSelectedItemsChange };
};
