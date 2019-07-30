const PREFIX = 'Python Importmagic: ';

export class Logger {
    public logError(message: string, ex?: Error) {
        // tslint:disable-next-line:no-console
        console.error(`${PREFIX}${message}`, error);
    }
    public logWarning(message: string, ex?: Error) {
        // tslint:disable-next-line:no-console
        console.warn(`${PREFIX}${message}`, ex);
    }
    public logDebug(message: string) {
        // tslint:disable-next-line:no-console
        console.log(`${PREFIX}${message}`); //, ex);
    }
}
// tslint:disable-next-line:no-any
export function error(title: string = '', message: any) {
    new Logger().logError(`${title}, ${message}`);
}
// tslint:disable-next-line:no-any
export function warn(title: string = '', message: any) {
    new Logger().logWarning(`${title}, ${message}`);
}
// tslint:disable-next-line:no-any
export function debug(message: any) {
    new Logger().logDebug(message);
}
