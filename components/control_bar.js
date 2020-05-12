export const ControlBar = () => {
  const dom = document.createElement('div');
  dom.classList.add('remfs-delver-control-bar');

  const curPathEl = document.createElement('span');
  curPathEl.innerText = "/";
  dom.appendChild(curPathEl);

  const btnContainerEl = document.createElement('span');
  btnContainerEl.classList.add('remfs-delver-control-bar__buttons');
  dom.appendChild(btnContainerEl);

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

  function onPathChange(path) {
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

  return { dom, onPathChange, onSelectedItemsChange };
};
