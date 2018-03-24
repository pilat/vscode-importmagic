import * as _ from 'lodash';

type AsyncVoidAction = (...params: {}[]) => Promise<void>;
type VoidAction = (...params: {}[]) => void;

/**
 * Debounces a function execution. Function must return either a void or a promise that resolves to a void.
 */
export function debounce(wait?: number) {
    // tslint:disable-next-line:no-any no-function-expression
    return function (_target: any, _propertyName: string, descriptor: TypedPropertyDescriptor<VoidAction> | TypedPropertyDescriptor<AsyncVoidAction>) {
        const originalMethod = descriptor.value!;
        // tslint:disable-next-line:no-invalid-this no-any
        (descriptor as any).value = _.debounce(function () { return originalMethod.apply(this, arguments); }, wait);
    };
}
