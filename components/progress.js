import { formatBytes } from '../utils.js';


export const Progress = (total) => {
  const dom = document.createElement('div');

  const barContainer = document.createElement('div');
  barContainer.classList.add('gemdrive-progress-bar__container');
  dom.appendChild(barContainer);

  const bar = document.createElement('div');
  bar.classList.add('gemdrive-progress-bar');
  barContainer.appendChild(bar);

  const text = document.createElement('div');
  dom.appendChild(text);
  text.innerText = formatBytes(0) + ' / ' + formatBytes(total);

  function updateCount(count) {
    if (count > total) {
      count = total;
    }
    text.innerText = formatBytes(count) + ' / ' + formatBytes(total);
    const percent = Math.round((count / total) * 100);
    bar.style.width = percent + '%';
  }

  return {
    dom,
    updateCount,
  };
};
