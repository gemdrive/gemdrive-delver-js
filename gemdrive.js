async function copy(srcDrive, srcPath, srcToken, dstDrive, dstPath, dstToken) {

  const isDir = srcPath.endsWith('/');

  if (isDir) {
    const tree = {};
    return copyDir(srcDrive, srcPath, srcToken, dstDrive, dstPath, dstToken, tree);
  }
  else {
    const srcPathSegments = srcPath.split('/');
    const filename = srcPathSegments[srcPathSegments.length - 1];
    const dstFilePath = dstPath + filename;
    return copyFile(srcDrive, srcPath, srcToken, dstDrive, dstFilePath, dstToken);
  }
}

async function makeDir(drive, path, token, recursive) {
  const url = drive + path + '?access_token=' + token;
  const res = await fetch(url, {
    method: 'PUT',
  });
}

async function copyDir(srcDrive, srcPath, srcToken, dstDrive, dstPath, dstToken, tree) {

  const srcPathSegments = srcPath.split('/');
  const dstDirName = srcPathSegments[srcPathSegments.length - 2];
  const newDstDir = dstPath + dstDirName + '/';

  try {
    const recursive = true;
    await makeDir(dstDrive, newDstDir, dstToken, true);
  }
  catch (e) {
    console.error(e);
    return;
  }

  const supportsTreeRequests = true;

  if (tree.children === undefined) {
    let reqFile;
    if (supportsTreeRequests) {
      reqFile = 'tree.json';
    }
    else {
      reqFile = 'list.json';
    }

    const reqUrl = srcDrive + '/gemdrive/index' + srcPath + reqFile + '?access_token=' + srcToken

    const res = await fetch(reqUrl);
    const subtree = await res.json();
    if (subtree.children !== undefined) {
      tree.children = subtree.children;
    }
  }

  if (tree.children !== undefined) {

    for (const [name, item] of Object.entries(tree.children)) {

      const childSrcPath = srcPath + name;

      const isDir = name.endsWith('/');

      if (isDir) {
        await copyDir(srcDrive, childSrcPath, srcToken, dstDrive, newDstDir, dstToken, tree.children[name]);
      }
      else {
        const childDstPath = newDstDir + name;
        await copyFile(srcDrive, childSrcPath, srcToken, dstDrive, childDstPath, dstToken);
      }
    }
  }
}

async function copyFile(srcDrive, srcPath, srcToken, dstDrive, dstPath, dstToken) {

  const reqUrl = dstDrive + '/gemdrive/remote-get?access_token=' + dstToken;

  const res = await fetch(reqUrl, {
    method: 'POST',
    body: JSON.stringify({
      source: srcDrive + srcPath + '?access_token=' + srcToken,
      destination: dstPath,
      preserveAttributes: true,
    }),
  });
}

export default {
  copy,
};
