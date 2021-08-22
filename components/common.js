const Button = (text) => {
  const dom = document.createElement('button');
  //dom.classList.add('gemdrive-delver-button');
  dom.classList.add('button');
  dom.innerText = text;
  return dom;
};

export {
  Button,
};
