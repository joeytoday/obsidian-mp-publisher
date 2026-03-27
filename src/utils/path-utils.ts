export type FilePathLike = {
    basename: string;
    parent: { path: string } | null;
};

/**
 * 根据模式和当前文件生成路径。
 * 以 `/` 开头的模式视为 Vault 绝对路径，否则相对于文档所在目录拼接。
 */
export function getPathFromPattern(pattern: string, file: FilePathLike): string {
    const parentPath = file.parent ? file.parent.path : '/';
    const resolvedPath = pattern.replace(/\$\{filename\}/g, file.basename);

    if (resolvedPath.startsWith('/')) {
        return resolvedPath.substring(1);
    }

    return parentPath === '/' ? resolvedPath : `${parentPath}/${resolvedPath}`;
}
