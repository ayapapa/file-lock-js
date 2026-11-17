	import { type LogProvider } from './lib/LockBaseConfig.ts';
	import { type CallbackOnLock, type MaybePromise } from './lib/LockBase.ts';
	import { FileLock } from './lib/FileLock.ts';
	import { FileLockError, LockCompromised, LockDirectoryCreationFailed, LockDirectoryStatFailed } from './lib/FileLockErrors.ts';
	import { AlreadyLocked, DeadlockDetected, InvalidConfiguration, InvalidOptions, LockError, PendingLocksExceeded, ReleaseFailed, TTLExceeded, type LockErrorProps } from './lib/LockBaseErrors.ts'
	import { type FileLockOptions } from './lib/FileLockOptions.ts';
	import { type FileLockConfig } from './lib/FileLockConfig.ts';
	import { type Monitor as LockMonitor } from './lib/LockMonitor.ts';
	export { 
		AlreadyLocked,
		DeadlockDetected, 
		FileLock,
		FileLockError,
		InvalidConfiguration,
		InvalidOptions,
		LockCompromised,
		LockDirectoryCreationFailed,
		LockDirectoryStatFailed,
		LockError,
		PendingLocksExceeded,
		ReleaseFailed,
		TTLExceeded,
		type CallbackOnLock,
		type FileLockConfig,
		type FileLockOptions,
		type LockErrorProps,
		type LockMonitor,
		type LogProvider,
		type MaybePromise,
	}
	export default FileLock;
