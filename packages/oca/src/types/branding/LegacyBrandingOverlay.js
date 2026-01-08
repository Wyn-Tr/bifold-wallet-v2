import { generateColor } from '../../utils/color';
import BaseOverlay from '../base/BaseOverlay';
export default class LegacyBrandingOverlay extends BaseOverlay {
    #background_color;
    #image_source;
    header;
    footer;
    constructor(credentialDefinitionId, overlay) {
        super(overlay);
        this.#background_color = overlay.background_color ?? generateColor(credentialDefinitionId);
        this.#image_source = overlay.image_source;
        if (overlay.header) {
            this.header = {
                color: overlay.header?.color,
                backgroundColor: overlay.header?.background_color,
                imageSource: overlay.header?.image_source,
                hideIssuer: overlay.header?.hide_issuer,
            };
        }
        if (overlay.footer) {
            this.footer = {
                color: overlay.footer?.color,
                backgroundColor: overlay.footer?.background_color,
            };
        }
    }
    get backgroundColor() {
        return this.#background_color;
    }
    get imageSource() {
        return this.#image_source;
    }
}
