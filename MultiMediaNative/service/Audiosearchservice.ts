import * as MediaLibrary from "expo-media-library";
import { PermissionsAndroid, Platform } from "react-native";

export interface AudioFile {
    id: string;
    filename: string;
    uri: string;
    duration: number;
    size: number;
    modificationTime: number;
    albumId: string | undefined;
    folder: string;
}

const TARGET_FOLDERS = [
    "/storage/emulated/0/Music",
    "/storage/emulated/0/Download",
    "/storage/emulated/0/WhatsApp/Media/WhatsApp Audio",
    "/storage/emulated/0/Telegram/Telegram Audio",
    "/storage/emulated/0/Recordings",
];

const AUDIO_EXTENSIONS = [
    ".mp3", ".wav", ".aac", ".ogg", ".flac",
    ".m4a", ".opus", ".wma", ".amr", ".3gp",
];

function isAudioFile(filename: string): boolean {
    const lower = filename.toLowerCase();
    return AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function getFolderFromUri(uri: string): string {
    const decoded = decodeURIComponent(uri);
    const match = TARGET_FOLDERS.find((folder) => decoded.includes(folder));
    return match ?? "Unknown";
}

async function requestPermissions(): Promise<boolean> {
    if (Platform.OS !== "android") return false;

    const sdkVersion = parseInt(Platform.Version as any, 10);

    if (sdkVersion >= 33) {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
}

async function fetchAllAudioAssets(): Promise<MediaLibrary.Asset[]> {
    const assets: MediaLibrary.Asset[] = [];
    let hasNextPage = true;
    let endCursor: string | undefined = undefined;

    while (hasNextPage) {
        const page = await MediaLibrary.getAssetsAsync({
            mediaType: MediaLibrary.MediaType.audio,
            first: 200,
            after: endCursor,
        });

        assets.push(...page.assets);
        hasNextPage = page.hasNextPage;
        endCursor = page.endCursor;
    }

    return assets;
}

function filterByTargetFolders(assets: MediaLibrary.Asset[]): MediaLibrary.Asset[] {
    return assets.filter((asset) => {
        const uri = decodeURIComponent(asset.uri);
        return TARGET_FOLDERS.some((folder) => uri.includes(folder));
    });
}

function mapToAudioFile(asset: MediaLibrary.Asset): AudioFile {
    return {
        id: asset.id,
        filename: asset.filename,
        uri: asset.uri,
        duration: asset.duration,
        size: (asset as any).fileSize ?? 0,
        modificationTime: asset.modificationTime,
        albumId: asset.albumId,
        folder: getFolderFromUri(asset.uri),
    };
}

export async function searchAudioFiles(): Promise<AudioFile[]> {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
        throw new Error("Permiso de almacenamiento denegado.");
    }

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
        throw new Error("Permiso de MediaLibrary denegado.");
    }

    const allAssets = await fetchAllAudioAssets();
    const filtered = filterByTargetFolders(allAssets);
    const validAudio = filtered.filter((a) => isAudioFile(a.filename));

    return validAudio.map(mapToAudioFile);
}

export async function searchAudioByFolder(folderPath: string): Promise<AudioFile[]> {
    const all = await searchAudioFiles();
    return all.filter((audio) => audio.folder === folderPath);
}

export async function searchAudioByName(query: string): Promise<AudioFile[]> {
    const all = await searchAudioFiles();
    const lower = query.toLowerCase();
    return all.filter((audio) => audio.filename.toLowerCase().includes(lower));
}

export async function getAudioGroupedByFolder(): Promise<Record<string, AudioFile[]>> {
    const all = await searchAudioFiles();
    return all.reduce<Record<string, AudioFile[]>>((acc, audio) => {
        if (!acc[audio.folder]) acc[audio.folder] = [];
        acc[audio.folder].push(audio);
        return acc;
    }, {});
}