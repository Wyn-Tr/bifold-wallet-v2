import { TOKENS, useServices } from '../container-api';
import { useEffect, useState } from 'react';
function isOCABundleResolveDefaultParams(params) {
    return 'meta' in params && !('attributes' in params);
}
function isOCABundleResolveAllParams(params) {
    return 'attributes' in params && 'meta' in params;
}
function isOCABundleResolvePresentationFieldsParams(params) {
    return 'attributes' in params && !('meta' in params);
}
export function useBranding(params) {
    const [bundleResolver] = useServices([TOKENS.UTIL_OCA_RESOLVER]);
    const [overlay, setOverlay] = useState({});
    useEffect(() => {
        if (isOCABundleResolveDefaultParams(params)) {
            bundleResolver.resolveDefaultBundle(params).then((bundle) => {
                if (bundle) {
                    setOverlay((o) => ({
                        ...o,
                        ...bundle,
                        brandingOverlay: bundle.brandingOverlay,
                    }));
                }
            });
        }
        else if (isOCABundleResolveAllParams(params)) {
            bundleResolver.resolveAllBundles(params).then((bundle) => {
                setOverlay((o) => ({
                    ...o,
                    ...bundle,
                    brandingOverlay: bundle.brandingOverlay,
                }));
            });
        }
        else if (isOCABundleResolvePresentationFieldsParams(params)) {
            bundleResolver.presentationFields(params).then((fields) => {
                setOverlay((o) => ({
                    ...o,
                    presentationFields: fields,
                }));
            });
        }
        else {
            bundleResolver.resolve(params).then((bundle) => {
                if (bundle) {
                    setOverlay((o) => ({
                        ...o,
                        ...bundle,
                        brandingOverlay: bundle.brandingOverlay,
                    }));
                }
            });
        }
    }, [params, bundleResolver]);
    return { overlay };
}
