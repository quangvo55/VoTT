import React from "react";
import { IAssetProps } from "./assetPreview";

export interface IImageProps extends IAssetProps, React.ClassAttributes<ImageAsset> {
}

export class ImageAsset extends React.Component<IImageProps> {
    private image: React.RefObject<HTMLImageElement> = React.createRef();

    public render() {
        const size = this.props.asset.size;
        let className = "";
        if (size) {
            className = size.width > size.height ? "landscape" : "portrait";
        }

        return (<img ref={this.image} className={className} src={this.props.asset.path} onLoad={this.onLoad} />);
    }

    private onLoad = () => {
        if (this.props.onLoaded) {
            this.props.onLoaded(this.image.current);
        }

        if (this.props.onActivated) {
            this.props.onActivated(this.image.current);
        }
    }
}
