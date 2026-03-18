import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';

/**
 * Converts a Blob to a Base64 string.
 * @param {Blob} blob 
 * @returns {Promise<string>}
 */
const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Checks if the current platform is native (Android/iOS).
 * @returns {Promise<boolean>}
 */
const isNative = async () => {
    const info = await Device.getInfo();
    return info.platform === 'android' || info.platform === 'ios';
};

/**
 * Shares a PDF file using native or web APIs.
 * @param {Blob} blob 
 * @param {string} filename 
 * @param {string} title 
 * @param {string} text 
 */
export const sharePDF = async (blob, filename, title, text) => {
    try {
        if (await isNative()) {
            const base64Data = await blobToBase64(blob);
            const savedFile = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Downloads,
            });

            await Share.share({
                title: title || 'Share PDF',
                text: text || 'Check out this PDF',
                url: savedFile.uri,
                dialogTitle: title || 'Share PDF',
            });
        } else {
            // Web fallback
            const file = new File([blob], filename, { type: 'application/pdf' });
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: title || 'Share PDF',
                    text: text || 'Check out this PDF',
                });
            } else {
                // Clipboard fallback if sharing is not supported
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            }
        }
    } catch (error) {
        console.error('Error sharing PDF:', error);
        throw error;
    }
};

/**
 * Downloads a PDF file. On native, this uses the share sheet to allow "Save to Files".
 * @param {Blob} blob 
 * @param {string} filename 
 */
export const downloadPDF = async (blob, filename) => {
    try {
        if (await isNative()) {
            // Sharing is the most reliable way to "download" on mobile WebViews
            // as it allows user to pick a target (drive, files, etc.)
            await sharePDF(blob, filename, 'Save PDF', 'Download your document');
        } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
    } catch (error) {
        console.error('Error downloading PDF:', error);
        throw error;
    }
};
