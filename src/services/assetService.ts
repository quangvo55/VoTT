import MD5 from "md5.js";
import _ from "lodash";
import Guard from "../common/guard";
import { IAsset, AssetType, IProject, IAssetMetadata, AssetState } from "../models/applicationState";
import { AssetProviderFactory, IAssetProvider } from "../providers/storage/assetProviderFactory";
import { StorageProviderFactory, IStorageProvider } from "../providers/storage/storageProviderFactory";
import { constants } from "../common/constants";

/**
 * @name - Asset Service
 * @description - Functions for dealing with project assets
 */
export class AssetService {

    /**
     * Create IAsset from filePath
     * @param filePath - filepath of asset
     * @param fileName - name of asset
     */
    public static createAssetFromFilePath(filePath: string, fileName?: string): IAsset {
        Guard.emtpy(filePath);

        const md5Hash = new MD5().update(filePath).digest("hex");
        const pathParts = filePath.split(/[\\\/]/);
        // Example filename: video.mp4#t=5
        // fileNameParts[0] = "video"
        // fileNameParts[1] = "mp4"
        // fileNameParts[2] = "t=5"
        const fileNameParts = pathParts[pathParts.length - 1].split(/[\.\?#]/);
<<<<<<< HEAD
        fileName = fileName || `${fileNameParts[0]}.${fileNameParts[1]}`;
=======
        fileName = fileName || fileNameParts[0];
>>>>>>> Making progress
        const assetFormat = fileNameParts.length >= 2 ? fileNameParts[1] : "";
        const assetType = this.getAssetType(assetFormat);

        return {
            id: md5Hash,
            format: assetFormat,
            state: AssetState.NotVisited,
            type: assetType,
            name: fileName,
            path: filePath,
            size: null,
        };
    }

    /**
     * Get Asset Type from format (file extension)
     * @param format - File extension of asset
     */
    public static getAssetType(format: string): AssetType {
        switch (format.toLowerCase()) {
            case "gif":
            case "jpg":
            case "jpeg":
            case "tif":
            case "tiff":
            case "png":
            case "bmp":
                return AssetType.Image;
            case "mp4":
            case "mov":
            case "avi":
            case "m4v":
            case "mpg":
            case "wmv":
                return AssetType.Video;
            case "tfrecord":
                return AssetType.TFRecord;
            default:
                return AssetType.Unknown;
        }
    }

    private assetProviderInstance: IAssetProvider;
    private storageProviderInstance: IStorageProvider;

    constructor(private project: IProject) {
        Guard.null(project);
    }

    /**
     * Get Asset Provider from project's source connction
     */
    protected get assetProvider(): IAssetProvider {
        if (!this.assetProviderInstance) {
            this.assetProviderInstance = AssetProviderFactory.create(
                this.project.sourceConnection.providerType,
                this.project.sourceConnection.providerOptions,
            );

            return this.assetProviderInstance;
        }
    }

    /**
     * Get Storage Provider from project's target connection
     */
    protected get storageProvider(): IStorageProvider {
        if (!this.storageProviderInstance) {
            this.storageProviderInstance = StorageProviderFactory.create(
                this.project.targetConnection.providerType,
                this.project.targetConnection.providerOptions,
            );
        }

        return this.storageProviderInstance;
    }

    /**
     * Get assets from provider
     */
    public async getAssets(): Promise<IAsset[]> {
        const assets = await this.assetProvider.getAssets();

        return assets.map((asset) => {
            const normalizedPath = asset.path.toLowerCase();

            // If the path is not already prefixed with a protocol
            // then assume it comes from the local file system
            if (!normalizedPath.startsWith("http://") &&
                !normalizedPath.startsWith("https://") &&
                !normalizedPath.startsWith("file:")) {
                asset.path = "file:" + asset.path;
                asset.path = encodeURI(asset.path.replace(/\\/g, "/"));
            }

            return asset;
        });
    }

    /**
     * Get a list of child assets associated with the current asset
     * @param parentAsset The parent asset to search
     */
    public getChildAssets(parentAsset: IAsset): IAsset[] {
        Guard.null(parentAsset);

        if (parentAsset.type !== AssetType.Video) {
            return [];
        }

        return _
            .values(this.project.assets)
            .filter((asset) => asset.parent && asset.parent.id === parentAsset.id)
            .sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Save metadata for asset
     * @param metadata - Metadata for asset
     */
    public async save(metadata: IAssetMetadata): Promise<IAssetMetadata> {
        Guard.null(metadata);

        // Only save asset metadata if asset is in a tagged state
        // Otherwise primary asset information is already persisted in the project file.
        if (metadata.asset.state === AssetState.Tagged) {
            const fileName = `${metadata.asset.id}${constants.assetMetadataFileExtension}`;
            await this.storageProvider.writeText(fileName, JSON.stringify(metadata, null, 4));
        }

        return metadata;
    }

    /**
     * Get metadata for asset
     * @param asset - Asset for which to retrieve metadata
     */
    public async getAssetMetadata(asset: IAsset): Promise<IAssetMetadata> {
        Guard.null(asset);

        const fileName = `${asset.id}${constants.assetMetadataFileExtension}`;
        try {
            const json = await this.storageProvider.readText(fileName);
            return JSON.parse(json) as IAssetMetadata;
        } catch (err) {
            return {
                asset: { ...asset },
                regions: [],
            };
        }
    }
}
