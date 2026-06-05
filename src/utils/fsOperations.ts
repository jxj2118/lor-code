import * as fs from "node:fs";
import {
    mkdir as mkdirPromise,
    open,
    readdir as readdirPromise,
    readFile as readFilePromise,
    rename as renamePromise,
    rmdir as rmdirPromise,
    rm as rmPromise,
    stat as statPromise,
    unlink as unlinkPromise,
} from 'fs/promises'
import {slowLogging} from "@/utils/slowOperations.ts";
import {getErrnoCode} from "@/utils/errors.ts";

export type FsOperations = {
    // File access and information operations
    /** Gets the current working directory */
    cwd(): string
    /** Checks if a file or directory exists */
    existsSync(path: string): boolean
    /** Gets file stats asynchronously */
    stat(path: string): Promise<fs.Stats>
    /** Lists directory contents with file type information asynchronously */
    readdir(path: string): Promise<fs.Dirent[]>
    /** Deletes file asynchronously */
    unlink(path: string): Promise<void>
    /** Removes an empty directory asynchronously */
    rmdir(path: string): Promise<void>
    /** Removes files and directories asynchronously (with recursive option) */
    rm(
        path: string,
        options?: { recursive?: boolean; force?: boolean },
    ): Promise<void>
    /** Creates directory recursively asynchronously. */
    mkdir(path: string, options?: { mode?: number }): Promise<void>
    /** Reads file content as string asynchronously */
    readFile(path: string, options: { encoding: BufferEncoding }): Promise<string>
    /** Renames/moves file asynchronously */
    rename(oldPath: string, newPath: string): Promise<void>
    /** Gets file stats */
    statSync(path: string): fs.Stats
    /** Gets file stats without following symlinks */
    lstatSync(path: string): fs.Stats

    // File content operations
    /** Reads file content as string with specified encoding */
    readFileSync(
        path: string,
        options: {
            encoding: BufferEncoding
        },
    ): string
    /** Reads raw file bytes as Buffer */
    readFileBytesSync(path: string): Buffer
    /** Reads specified number of bytes from file start */
    readSync(
        path: string,
        options: {
            length: number
        },
    ): {
        buffer: Buffer
        bytesRead: number
    }
    /** Appends string to file */
    appendFileSync(path: string, data: string, options?: { mode?: number }): void
    /** Copies file from source to destination */
    copyFileSync(src: string, dest: string): void
    /** Deletes file */
    unlinkSync(path: string): void
    /** Renames/moves file */
    renameSync(oldPath: string, newPath: string): void
    /** Creates hard link */
    linkSync(target: string, path: string): void
    /** Creates symbolic link */
    symlinkSync(
        target: string,
        path: string,
        type?: 'dir' | 'file' | 'junction',
    ): void
    /** Reads symbolic link */
    readlinkSync(path: string): string
    /** Resolves symbolic links and returns the canonical pathname */
    realpathSync(path: string): string

    // Directory operations
    /** Creates directory recursively. Mode defaults to 0o777 & ~umask if not specified. */
    mkdirSync(
        path: string,
        options?: {
            mode?: number
        },
    ): void
    /** Lists directory contents with file type information */
    readdirSync(path: string): fs.Dirent[]
    /** Lists directory contents as strings */
    readdirStringSync(path: string): string[]
    /** Checks if the directory is empty */
    isDirEmptySync(path: string): boolean
    /** Removes an empty directory */
    rmdirSync(path: string): void
    /** Removes files and directories (with recursive option) */
    rmSync(
        path: string,
        options?: {
            recursive?: boolean
            force?: boolean
        },
    ): void
    /** Create a writable stream for writing data to a file. */
    createWriteStream(path: string): fs.WriteStream
    /** Reads raw file bytes as Buffer asynchronously.
     *  When maxBytes is set, only reads up to that many bytes. */
    readFileBytes(path: string, maxBytes?: number): Promise<Buffer>
}
/**
 * Gets the currently active filesystem implementation
 * @returns The currently active filesystem implementation
 */
export function getFsImplementation(): FsOperations {
    return activeFs
}


/**
 * Safely resolves a file path, handling symlinks and errors gracefully.
 *
 * Error handling strategy:
 * - If the file doesn't exist, returns the original path (allows for file creation)
 * - If symlink resolution fails (broken symlink, permission denied, circular links),
 *   returns the original path and marks it as not a symlink
 * - This ensures operations can continue with the original path rather than failing
 *
 * @param fs The filesystem implementation to use
 * @param filePath The path to resolve
 * @returns Object containing the resolved path and whether it was a symlink
 */
export function safeResolvePath(
    fs: FsOperations,
    filePath: string,
): { resolvedPath: string; isSymlink: boolean; isCanonical: boolean } {
    // Block UNC paths before any filesystem access to prevent network
    // requests (DNS/SMB) during validation on Windows
    if (filePath.startsWith('//') || filePath.startsWith('\\\\')) {
        return { resolvedPath: filePath, isSymlink: false, isCanonical: false }
    }

    try {
        // Check for special file types (FIFOs, sockets, devices) before calling realpathSync.
        // realpathSync can block on FIFOs waiting for a writer, causing hangs.
        // If the file doesn't exist, lstatSync throws ENOENT which the catch
        // below handles by returning the original path (allows file creation).
        const stats = fs.lstatSync(filePath)
        if (
            stats.isFIFO() ||
            stats.isSocket() ||
            stats.isCharacterDevice() ||
            stats.isBlockDevice()
        ) {
            return { resolvedPath: filePath, isSymlink: false, isCanonical: false }
        }

        const resolvedPath = fs.realpathSync(filePath)
        return {
            resolvedPath,
            isSymlink: resolvedPath !== filePath,
            // realpathSync returned: resolvedPath is canonical (all symlinks in
            // all path components resolved). Callers can skip further symlink
            // resolution on this path.
            isCanonical: true,
        }
    } catch (_error) {
        // If lstat/realpath fails for any reason (ENOENT, broken symlink,
        // EACCES, ELOOP, etc.), return the original path to allow operations
        // to proceed
        return { resolvedPath: filePath, isSymlink: false, isCanonical: false }
    }
}

export const NodeFsOperations: FsOperations = {
    cwd() {
        return process.cwd()
    },

    existsSync(fsPath) {
        using _ = slowLogging`fs.existsSync(${fsPath})`
        return fs.existsSync(fsPath)
    },

    async stat(fsPath) {
        return statPromise(fsPath)
    },

    async readdir(fsPath) {
        return readdirPromise(fsPath, { withFileTypes: true })
    },

    async unlink(fsPath) {
        return unlinkPromise(fsPath)
    },

    async rmdir(fsPath) {
        return rmdirPromise(fsPath)
    },

    async rm(fsPath, options) {
        return rmPromise(fsPath, options)
    },

    async mkdir(dirPath, options) {
        try {
            await mkdirPromise(dirPath, { recursive: true, ...options })
        } catch (e) {
            // Bun/Windows: recursive:true throws EEXIST on directories with the
            // FILE_ATTRIBUTE_READONLY bit set (Group Policy, OneDrive, desktop.ini).
            // Bun's directoryExistsAt misclassifies DIRECTORY+READONLY as not-a-dir
            // (bun-internal src/sys.zig existsAtType). The dir exists; ignore.
            // https://github.com/anthropics/claude-code/issues/30924
            if (getErrnoCode(e) !== 'EEXIST') throw e
        }
    },

    async readFile(fsPath, options) {
        return readFilePromise(fsPath, { encoding: options.encoding })
    },

    async rename(oldPath, newPath) {
        return renamePromise(oldPath, newPath)
    },

    statSync(fsPath) {
        using _ = slowLogging`fs.statSync(${fsPath})`
        return fs.statSync(fsPath)
    },

    lstatSync(fsPath) {
        using _ = slowLogging`fs.lstatSync(${fsPath})`
        return fs.lstatSync(fsPath)
    },

    readFileSync(fsPath, options) {
        using _ = slowLogging`fs.readFileSync(${fsPath})`
        return fs.readFileSync(fsPath, { encoding: options.encoding })
    },

    readFileBytesSync(fsPath) {
        using _ = slowLogging`fs.readFileBytesSync(${fsPath})`
        return fs.readFileSync(fsPath)
    },

    readSync(fsPath, options) {
        using _ = slowLogging`fs.readSync(${fsPath}, ${options.length} bytes)`
        let fd: number | undefined = undefined
        try {
            fd = fs.openSync(fsPath, 'r')
            const buffer = Buffer.alloc(options.length)
            const bytesRead = fs.readSync(fd, buffer, 0, options.length, 0)
            return { buffer, bytesRead }
        } finally {
            if (fd) fs.closeSync(fd)
        }
    },

    appendFileSync(path, data, options) {
        using _ = slowLogging`fs.appendFileSync(${path}, ${data.length} chars)`
        // For new files with explicit mode, use 'ax' (atomic create-with-mode) to avoid
        // TOCTOU race between existence check and open. Fall back to normal append if exists.
        if (options?.mode !== undefined) {
            try {
                const fd = fs.openSync(path, 'ax', options.mode)
                try {
                    fs.appendFileSync(fd, data)
                } finally {
                    fs.closeSync(fd)
                }
                return
            } catch (e) {
                if (getErrnoCode(e) !== 'EEXIST') throw e
                // File exists — fall through to normal append
            }
        }
        fs.appendFileSync(path, data)
    },

    copyFileSync(src, dest) {
        using _ = slowLogging`fs.copyFileSync(${src} → ${dest})`
        fs.copyFileSync(src, dest)
    },

    unlinkSync(path: string) {
        using _ = slowLogging`fs.unlinkSync(${path})`
        fs.unlinkSync(path)
    },

    renameSync(oldPath: string, newPath: string) {
        using _ = slowLogging`fs.renameSync(${oldPath} → ${newPath})`
        fs.renameSync(oldPath, newPath)
    },

    linkSync(target: string, path: string) {
        using _ = slowLogging`fs.linkSync(${target} → ${path})`
        fs.linkSync(target, path)
    },

    symlinkSync(
        target: string,
        path: string,
        type?: 'dir' | 'file' | 'junction',
    ) {
        using _ = slowLogging`fs.symlinkSync(${target} → ${path})`
        fs.symlinkSync(target, path, type)
    },

    readlinkSync(path: string) {
        using _ = slowLogging`fs.readlinkSync(${path})`
        return fs.readlinkSync(path)
    },

    realpathSync(path: string) {
        using _ = slowLogging`fs.realpathSync(${path})`
        return fs.realpathSync(path).normalize('NFC')
    },

    mkdirSync(dirPath, options) {
        using _ = slowLogging`fs.mkdirSync(${dirPath})`
        const mkdirOptions: { recursive: boolean; mode?: number } = {
            recursive: true,
        }
        if (options?.mode !== undefined) {
            mkdirOptions.mode = options.mode
        }
        try {
            fs.mkdirSync(dirPath, mkdirOptions)
        } catch (e) {
            // Bun/Windows: recursive:true throws EEXIST on directories with the
            // FILE_ATTRIBUTE_READONLY bit set (Group Policy, OneDrive, desktop.ini).
            // Bun's directoryExistsAt misclassifies DIRECTORY+READONLY as not-a-dir
            // (bun-internal src/sys.zig existsAtType). The dir exists; ignore.
            // https://github.com/anthropics/claude-code/issues/30924
            if (getErrnoCode(e) !== 'EEXIST') throw e
        }
    },

    readdirSync(dirPath) {
        using _ = slowLogging`fs.readdirSync(${dirPath})`
        return fs.readdirSync(dirPath, { withFileTypes: true })
    },

    readdirStringSync(dirPath) {
        using _ = slowLogging`fs.readdirStringSync(${dirPath})`
        return fs.readdirSync(dirPath)
    },

    isDirEmptySync(dirPath) {
        using _ = slowLogging`fs.isDirEmptySync(${dirPath})`
        const files = this.readdirSync(dirPath)
        return files.length === 0
    },

    rmdirSync(dirPath) {
        using _ = slowLogging`fs.rmdirSync(${dirPath})`
        fs.rmdirSync(dirPath)
    },

    rmSync(path, options) {
        using _ = slowLogging`fs.rmSync(${path})`
        fs.rmSync(path, options)
    },

    createWriteStream(path: string) {
        return fs.createWriteStream(path)
    },

    async readFileBytes(fsPath: string, maxBytes?: number) {
        if (maxBytes === undefined) {
            return readFilePromise(fsPath)
        }
        const handle = await open(fsPath, 'r')
        try {
            const { size } = await handle.stat()
            const readSize = Math.min(size, maxBytes)
            const buffer = Buffer.allocUnsafe(readSize)
            let offset = 0
            while (offset < readSize) {
                const { bytesRead } = await handle.read(
                    buffer,
                    offset,
                    readSize - offset,
                    offset,
                )
                if (bytesRead === 0) break
                offset += bytesRead
            }
            return offset < readSize ? buffer.subarray(0, offset) : buffer
        } finally {
            await handle.close()
        }
    },
}

// The currently active filesystem implementation
let activeFs: FsOperations = NodeFsOperations

/**
 * Overrides the filesystem implementation. Note: This function does not
 * automatically update cwd.
 * @param implementation The filesystem implementation to use
 */
export function setFsImplementation(implementation: FsOperations): void {
    activeFs = implementation
}
