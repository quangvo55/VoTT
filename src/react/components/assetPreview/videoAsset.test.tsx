import React from "react";
import { ReactWrapper, mount } from "enzyme";
import { IVideoAssetProps, VideoAsset, IVideoPlayerState, IVideoAssetState } from "./videoAsset";
import MockFactory from "../../../common/mockFactory";
import { CustomVideoPlayerButton } from "../common/videoPlayer/customVideoPlayerButton";

import { Player } from "video-react";
import { AssetType, AssetState } from "../../../models/applicationState";

describe("Video Asset Component", () => {
    let wrapper: ReactWrapper<IVideoAssetProps, IVideoAssetState> = null;
    let onVideoStateChangeHandler: (state: Readonly<IVideoPlayerState>, prev: Readonly<IVideoPlayerState>) => void;
    const videoPlayerMock = Player as jest.Mocked<typeof Player>;
    const onLoadedHandler = jest.fn();
    const onActivatedHandler = jest.fn();
    const onDeactivatedHandler = jest.fn();
    const onChildSelectedHandler = jest.fn();
    const defaultProps: IVideoAssetProps = {
        asset: MockFactory.createVideoTestAsset("test-video"),
        autoPlay: false,
        onLoaded: onLoadedHandler,
        onActivated: onActivatedHandler,
        onDeactivated: onDeactivatedHandler,
        onChildAssetSelected: onChildSelectedHandler,
    };

    beforeEach(() => {
        videoPlayerMock.prototype.subscribeToStateChange = jest.fn((handler) => onVideoStateChangeHandler = handler);
        videoPlayerMock.prototype.pause = jest.fn();
        videoPlayerMock.prototype.seek = jest.fn((timestamp) => {
            mockPaused(timestamp);
        });
    });

    function createComponent(props?: IVideoAssetProps): ReactWrapper<IVideoAssetProps, IVideoAssetState> {
        props = props || defaultProps;

        return mount(<VideoAsset {...props} />);
    }

    it("renders correctly", () => {
        wrapper = createComponent();

        expect(wrapper.find(Player).exists()).toBe(true);
        expect(wrapper.find(CustomVideoPlayerButton).length).toEqual(2);
    });

    it("resets loaded state when asset changes", () => {
        wrapper = createComponent();
        mockLoaded();

        const newAsset = MockFactory.createVideoTestAsset("new-video-asset");
        wrapper.setProps({ asset: newAsset });
        expect(wrapper.state().loaded).toBe(false);
    });

    it("seeks the video player to the spcified timestamp when timestamp changes", () => {
        const expectedTime = 10.2;
        wrapper = createComponent();
        mockLoaded();

        wrapper.setProps({ timestamp: expectedTime });
        expect(videoPlayerMock.prototype.seek).toBeCalledWith(expectedTime);
    });

    it("moves to the next tagged frame when clicking the next button", () => {
        const childAssets = MockFactory.createChildVideoAssets(defaultProps.asset);
        const currentAsset = childAssets[0];
        const expectedAsset = {
            ...childAssets[1],
            state: AssetState.Visited,
        };

        videoPlayerMock.prototype.getState = jest.fn(() => {
            return {
                player: {
                    currentTime: currentAsset.timestamp,
                },
            };
        });

        const props: IVideoAssetProps = {
            ...defaultProps,
            childAssets: childAssets,
            timestamp: currentAsset.timestamp,
        };

        wrapper = createComponent(props);
        mockLoaded();

        wrapper.find(CustomVideoPlayerButton).at(1).simulate("click");

        expect(videoPlayerMock.prototype.pause).toBeCalled();
        expect(videoPlayerMock.prototype.seek).toBeCalledWith(expectedAsset.timestamp);
        expect(onChildSelectedHandler).toBeCalledWith(expectedAsset);
    });

    it("moves to the previous tagged frame when clicking the back button", () => {
        const childAssets = MockFactory.createChildVideoAssets(defaultProps.asset);
        const currentAsset = childAssets[4];
        const expectedAsset = {
            ...childAssets[3],
            state: AssetState.Visited,
        };

        videoPlayerMock.prototype.getState = jest.fn(() => {
            return {
                player: {
                    currentTime: currentAsset.timestamp,
                },
            };
        });

        const props: IVideoAssetProps = {
            ...defaultProps,
            childAssets: childAssets,
            timestamp: currentAsset.timestamp,
        };

        wrapper = createComponent(props);
        mockLoaded();

        wrapper.find(CustomVideoPlayerButton).at(0).simulate("click");

        expect(videoPlayerMock.prototype.pause).toBeCalled();
        expect(videoPlayerMock.prototype.seek).toBeCalledWith(expectedAsset.timestamp);
        expect(onChildSelectedHandler).toBeCalledWith(expectedAsset);
    });

    it("raises the onLoad and activated handlers when the video has been loaded", () => {
        wrapper = createComponent();
        mockLoaded();

        expect(onLoadedHandler).toBeCalledWith(expect.any(HTMLVideoElement));
        expect(onActivatedHandler).toBeCalledWith(expect.any(HTMLVideoElement));
        expect(wrapper.state().loaded).toBe(true);
    });

    it("raises the child asset selected and deactivated handlers when the video is paused", () => {
        const expectedTime = 10.5;
        wrapper = createComponent();
        mockLoaded();
        mockPaused(expectedTime);

        expect(onDeactivatedHandler).toBeCalledWith(expect.any(HTMLVideoElement));
        expect(onChildSelectedHandler).toBeCalledWith(expect.objectContaining({
            type: AssetType.VideoFrame,
            path: `${defaultProps.asset.path}#t=${expectedTime}`,
            timestamp: expectedTime,
            parent: defaultProps.asset,
        }));
    });

    it("raises the activated handler when the video resumes", () => {
        wrapper = createComponent();
        mockLoaded();
        mockPaused(4.0);

        onLoadedHandler.mockReset();
        onDeactivatedHandler.mockReset();

        mockResume();

        expect(onLoadedHandler).not.toBeCalled();
        expect(onDeactivatedHandler).not.toBeCalled();
        expect(onActivatedHandler).toBeCalledWith(expect.any(HTMLVideoElement));
    });

    function mockLoaded() {
        const state: IVideoPlayerState = {
            readyState: 4,
            paused: false,
            currentTime: 0,
            seeking: false,
        };

        const prev: IVideoPlayerState = {
            readyState: 1,
            paused: false,
            currentTime: 0,
            seeking: false,
        };

        onVideoStateChangeHandler(state, prev);
    }

    function mockPaused(currentTime: number) {
        const state: IVideoPlayerState = {
            readyState: 4,
            paused: true,
            currentTime,
            seeking: false,
        };

        const prev: IVideoPlayerState = {
            readyState: 4,
            paused: false,
            currentTime: 2.0,
            seeking: true,
        };

        onVideoStateChangeHandler(state, prev);
    }

    function mockResume() {
        const state: IVideoPlayerState = {
            readyState: 4,
            paused: false,
            currentTime: 0,
            seeking: false,
        };

        const prev: IVideoPlayerState = {
            readyState: 4,
            paused: true,
            currentTime: 0,
            seeking: false,
        };

        onVideoStateChangeHandler(state, prev);
    }
});
