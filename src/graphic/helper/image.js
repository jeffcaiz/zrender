
import LRU from '../../core/LRU';

var globalImageCache = new LRU(50);

/**
 * @param {string|HTMLImageElement|HTMLCanvasElement|Canvas} newImageOrSrc
 * @return {HTMLImageElement|HTMLCanvasElement|Canvas} image
 */
export function findExistImage(newImageOrSrc) {
    if (typeof newImageOrSrc === 'string') {
        var cachedImgObj = globalImageCache.get(newImageOrSrc);
        return cachedImgObj && cachedImgObj.image;
    }
    else {
        return newImageOrSrc;
    }
}

/**
 * Caution: User should cache loaded images, but not just count on LRU.
 * Consider if required images more than LRU size, will dead loop occur?
 *
 * @param {string} newImageOrSrc
 * @param {Image} image Existent image(custom defined image object).
 * @param {module:zrender/Element} [hostEl] For calling `dirty`.
 * @param {Function} [cb] params: (image, cbPayload)
 * @param {Object} [cbPayload] Payload on cb calling.
 * @return {HTMLImageElement|HTMLCanvasElement|Canvas} image
 */
export function createOrUpdateImage(newImageOrSrc, image, hostEl, cb, cbPayload) {
    if (!newImageOrSrc) {
        return image;
    }
    else if (typeof newImageOrSrc === 'string') {

        // Image should not be loaded repeatly.
        if ((image && image.__zrImageSrc === newImageOrSrc) || !hostEl) {
            return image;
        }

        // Only when there is no existent image or existent image src
        // is different, this method is responsible for load.
        var cachedImgObj = globalImageCache.get(newImageOrSrc);

        var pendingWrap = {hostEl: hostEl, cb: cb, cbPayload: cbPayload};

        if (cachedImgObj) {
            image = cachedImgObj.image;
            !isImageReady(image) && cachedImgObj.pending.push(pendingWrap);
        }
        else {
            !image && (image = new Object());
            image.onload = imageOnLoad;

            globalImageCache.put(
                newImageOrSrc,
                image.__cachedImgObj = {
                    image: image,
                    pending: [pendingWrap]
                }
            );

            image.src = image.__zrImageSrc = newImageOrSrc;

            // Issue wx.getImageInfo for loading
            wx.getImageInfo({
                src: newImageOrSrc,
                success: function(res) {
                    image.width = res.width;
                    image.height = res.height;
                    image.path = res.path;
                    image.orientation = res.orientation;
                    image.type = res.type;
                    image.onload();
                },
                fail: {

                }
            });
        }

        return image;
    }
    // newImageOrSrc is an HTMLImageElement or HTMLCanvasElement or Canvas
    else {
        return newImageOrSrc;
    }
}

function imageOnLoad() {
    var cachedImgObj = this.__cachedImgObj;
    this.onload = this.__cachedImgObj = null;

    for (var i = 0; i < cachedImgObj.pending.length; i++) {
        var pendingWrap = cachedImgObj.pending[i];
        var cb = pendingWrap.cb;
        cb && cb(this, pendingWrap.cbPayload);
        pendingWrap.hostEl.dirty();
    }
    cachedImgObj.pending.length = 0;
}

export function isImageReady(image) {
    return image && image.width && image.height;
}

