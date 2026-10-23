/**
 * @internal 
 * Lock-related information stored in a lock file.
 */
export interface FileLockMeta {
  /** ID of the owner who acquired the lock. */
  ownerId: string,

  /** ID of the process executing the lock. */
  processId?: number,

  /** ID of the parent process of the lock-executing process. */
  parentProcessId?: number,

  /** An array containing the command-line arguments passed when the Node.js process was launched.  */
  processArgv?: string[],

  /** Lock expiration time. */
  expiresAt: number,

  /** The last heartbeat time. */
  heartbeatExpiresAt: number,

}
