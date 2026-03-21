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
 * Shares a file using native or web APIs.
 * @param {Blob} blob 
 * @param {string} filename 
 * @param {string} title 
 * @param {string} text 
 * @param {string} mimeType 
 */
export const shareFile = async (blob, filename, title, text, mimeType = 'application/pdf') => {
    try {
        if (await isNative()) {
            const base64Data = await blobToBase64(blob);
            const savedFile = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Cache,
            });

            await Share.share({
                title: title || 'Share File',
                text: text || 'Transferring file...',
                url: savedFile.uri,
                dialogTitle: title || 'Share File',
            });
        } else {
            // Web fallback
            const file = new File([blob], filename, { type: mimeType });
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: title || 'Share',
                    text: text || '',
                });
            } else {
                // Download fallback
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            }
        }
    } catch (error) {
        console.error('Error sharing file:', error);
        throw error;
    }
};

/**
 * Specifically shares a PDF file.
 */
export const sharePDF = (blob, filename, title, text) => 
    shareFile(blob, filename, title, text, 'application/pdf');

/**
 * Downloads a file. On native, this uses the share sheet for better destination picking.
 * @param {Blob} blob 
 * @param {string} filename 
 * @param {string} mimeType
 */
export const downloadFile = async (blob, filename, mimeType = 'application/octet-stream') => {
    try {
        if (await isNative()) {
            // Sharing is the most reliable way to "download" on mobile WebViews
            await shareFile(blob, filename, 'Save File', 'Download your document', mimeType);
        } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
    } catch (error) {
        console.error('Error downloading file:', error);
        throw error;
    }
};

/**
 * Specifically downloads a PDF file.
 */
export const downloadPDF = (blob, filename) => 
    downloadFile(blob, filename, 'application/pdf');
