export const Progress = (total) => {
  const dom = document.createElement('div');

  const barContainer = document.createElement('div');
  barContainer.classList.add('remfs-progress-bar__container');
  dom.appendChild(barContainer);

  const bar = document.createElement('div');
  bar.classList.add('remfs-progress-bar');
  barContainer.appendChild(bar);

  const text = document.createElement('div');
  dom.appendChild(text);
  text.innerText = formatBytes(0) + ' / ' + formatBytes(total);

  function updateCount(count) {
    text.innerText = formatBytes(count) + ' / ' + formatBytes(total);
    const percent = Math.round((count / total) * 100);
    bar.style.width = percent + '%';
  }

  return {
    dom,
    updateCount,
  };
};

function formatBytes(bytes) {
  if (bytes > 1000000000) {
    return (bytes / 1000000000).toFixed(2) + 'GB';
  }
  else if (bytes > 1000000) {
    return Math.round(bytes / 1000000).toString() + 'MB';
  }
  else if (bytes > 1000) {
    return Math.round(bytes / 1000).toString() + 'KB';
  }
  else {
    return bytes.toString() + " bytes";
  }
}
