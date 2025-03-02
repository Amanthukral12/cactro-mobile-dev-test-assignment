import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Image,
  Linking,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Camera, CameraView } from "expo-camera";
import * as MediaLibrary from "expo-media-library";

import { STICKERS } from "@/constants";
import { MaterialIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
const HomeScreen = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [drawingMode, setDrawingMode] = useState(false);
  const [currentPath, setCurrentPath] = useState<
    { x: number; y: number; color: string }[]
  >([]);
  const [currentColor, setCurrentColor] = useState("#FF0000");
  const [paths, setPaths] = useState<
    { x: number; y: number; color: string }[][]
  >([]);
  const [selectedSticker, setSelectedSticker] = useState<{
    id: number;

    uri: any;
  } | null>(null);
  const [placedStickers, setPlacedStickers] = useState<
    { id: number; stickerId: any; uri: any; x: number; y: number }[]
  >([]);
  const [caption, setCaption] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
      const { status: mediaStatus } =
        await MediaLibrary.requestPermissionsAsync();
      if (mediaStatus !== "granted") {
        Alert.alert(
          "Permission required",
          "Media library access is needed to save photos"
        );
      }
    })();
  }, []);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => drawingMode,
    onMoveShouldSetPanResponder: () => drawingMode,
    onPanResponderGrant: (event) => {
      if (!drawingMode) return;
      const { locationX, locationY } = event.nativeEvent;
      setCurrentPath([{ x: locationX, y: locationY, color: currentColor }]);
    },
    onPanResponderMove: (event) => {
      if (!drawingMode) return;
      const { locationX, locationY } = event.nativeEvent;
      setCurrentPath((prevPath) => [
        ...prevPath,
        { x: locationX, y: locationY, color: currentColor },
      ]);
    },
    onPanResponderRelease: () => {
      if (drawingMode && currentPath.length > 0) {
        setPaths((prevPaths) => [...prevPaths, currentPath]);
        setCurrentPath([]);
      }
    },
  });

  const stickerPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => selectedSticker !== null,
    onMoveShouldSetPanResponder: () => selectedSticker !== null,
    onPanResponderGrant: (event) => {
      if (selectedSticker) {
        const { locationX, locationY } = event.nativeEvent;
        const newSticker = {
          id: Date.now(),
          stickerId: selectedSticker.id,
          uri: selectedSticker.uri,
          x: locationX - 40,
          y: locationY - 40,
        };
        setPlacedStickers((prev) => [...prev, newSticker]);
        setSelectedSticker(null);
      }
    },
  });

  const takePicture = async () => {
    if (cameraRef.current && cameraReady) {
      try {
        let photo = await cameraRef.current?.takePictureAsync();
        if (photo?.uri) {
          setCapturedImage(photo.uri);
          setIsEditing(true);
        } else {
          setCapturedImage(null);
        }
      } catch (error) {
        console.error("Error taking picture:", error);
        Alert.alert("Error", "Failed to capture image");
      }
    }
  };
  const handleCameraReady = () => {
    setCameraReady(true);
  };

  const renderCamera = () => {
    if (hasPermission === null) {
      return (
        <View style={styles.container}>
          <Text>Requesting permissions...</Text>
        </View>
      );
    }
    if (hasPermission === false) {
      return (
        <View style={styles.container}>
          <Text>No access to camera</Text>
        </View>
      );
    }
    return (
      <CameraView
        ref={cameraRef}
        facing="front"
        onCameraReady={handleCameraReady}
        style={{ width: "100%", height: "90%" }}
        responsiveOrientationWhenOrientationLocked
      >
        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={takePicture}
            disabled={!cameraReady}
          >
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>
        </View>
      </CameraView>
    );
  };

  const drawLine = (path: any) => {
    if (path.length < 2) return null;
    let d = `M ${path[0].x} ${path[0].y}`;
    for (let i = 1; i < path.length; i++) {
      d += ` L ${path[i].x} ${path[i].y}`;
    }
    return (
      <View
        key={`path-${Date.now()}-${Math.random()}`}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          zIndex: 2,
        }}
      >
        {path.map((point: any, index: number) => {
          if (index === 0) return null;
          const prevPoint = path[index - 1];
          return (
            <View
              key={`line-${index}`}
              style={{
                position: "absolute",
                left: prevPoint.x,
                top: prevPoint.y,
                width: Math.sqrt(
                  Math.pow(point.x - prevPoint.x, 2) +
                    Math.pow(point.y - prevPoint.y, 2)
                ),
                height: 5,
                backgroundColor: point.color,
                transform: [
                  {
                    rotate: `${Math.atan2(
                      point.y - prevPoint.y,
                      point.x - prevPoint.x
                    )}rad`,
                  },
                ],
                transformOrigin: "left",
                borderRadius: 2.5,
              }}
            />
          );
        })}
      </View>
    );
  };

  const renderEditScreen = () => {
    const colorOptions = [
      "#FF0000",
      "#00FF00",
      "#0000FF",
      "#FFFF00",
      "#FF00FF",
    ];
    return (
      <View style={styles.editContainer}>
        <View style={styles.canvasContainer}>
          <Image
            source={{ uri: capturedImage || "" }}
            style={styles.capturedImage}
            {...panResponder.panHandlers}
            {...stickerPanResponder.panHandlers}
          />
          {paths.map((path, index) => (
            <View key={`drawing-${index}`}>{drawLine(path)}</View>
          ))}
          {currentPath.length > 0 && drawLine(currentPath)}
          {placedStickers.map((sticker) => (
            <Image
              key={`sticker-${sticker.id}`}
              source={sticker.uri}
              style={[
                styles.placedSticker,
                { left: sticker.x, top: sticker.y },
              ]}
            />
          ))}
        </View>
        <View style={styles.editTools}>
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeButton, drawingMode && styles.activeMode]}
              onPress={() => {
                setDrawingMode(true);
                setSelectedSticker(null);
              }}
            >
              <MaterialIcons
                name="edit"
                size={24}
                color={drawingMode ? "#FFF" : "#000"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeButton, !drawingMode && styles.activeMode]}
              onPress={() => {
                setDrawingMode(false);
              }}
            >
              <MaterialIcons
                name="emoji-emotions"
                size={24}
                color={!drawingMode ? "#FFF" : "#000"}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.toolOptions}>
            {drawingMode ? (
              <View style={styles.colorSelector}>
                {colorOptions.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      currentColor === color && styles.selectedColor,
                    ]}
                    onPress={() => setCurrentColor(color)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.stickerSelector}>
                {STICKERS.map((sticker) => (
                  <TouchableOpacity
                    key={sticker.id}
                    style={styles.stickerOption}
                    onPress={() => setSelectedSticker(sticker)}
                  >
                    <Image source={sticker.uri} style={styles.stickerPreview} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption..."
            value={caption}
            onChangeText={setCaption}
            multiline
          />

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => {
                setCapturedImage(null);
                setIsEditing(false);
                setPaths([]);
                setCurrentPath([]);
                setPlacedStickers([]);
                setCaption("");
              }}
            >
              <Text style={styles.buttonText}>Discard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton]}
              onPress={shareToInstagram}
            >
              <Text style={styles.buttonText}>Share to Instagram</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const captureCanvas = async () => {
    return capturedImage;
  };

  const shareToInstagram = async () => {
    try {
      const canvasImage = await captureCanvas();
      const filename = `${FileSystem.cacheDirectory}image-to-share.jpg`;
      if (canvasImage) {
        await FileSystem.copyAsync({
          from: canvasImage,
          to: filename,
        });
      } else {
        throw new Error("Failed to capture canvas image");
      }

      const instagramUrl = `instagram-stories://share`;
      const canOpenInstagram = await Linking.canOpenURL(instagramUrl);
      if (canOpenInstagram) {
        if (Platform.OS === "ios") {
          const instagramShareUrl = `instagram://library?AssetPath=${encodeURIComponent(
            filename
          )}&InstagramCaption=${encodeURIComponent(caption)}`;
          await Linking.openURL(instagramShareUrl);
        } else {
          const fileUri = filename.replace("file://", "");

          const storiesUrl = `instagram-stories://share`;
          const appId = process.env.EXPO_PUBLIC_APP_ID;
          let fullUrl = `${storiesUrl}?source_application=${encodeURIComponent(
            appId!
          )}`;
          fullUrl += `&background_image=${encodeURIComponent(fileUri)}`;

          fullUrl += `&background_bottom_color=%23FFFFFF`;
          fullUrl += `&background_top_color=%23FFFFFF`;
          if (caption) {
            fullUrl += `&caption=${encodeURIComponent(caption)}`;
          }

          await Linking.openURL(fullUrl);
        }
      } else {
        Alert.alert(
          "Instagram Not Found",
          "Instagram app is not installed. Would you like to save this image to your gallery instead?",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Save Image",
              onPress: async () => {
                await MediaLibrary.saveToLibraryAsync(filename);
                Alert.alert("Success", "Image saved to gallery");
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error sharing to Instagram:", error);
      Alert.alert("Error", "Failed to share to Instagram");
    }
  };
  return (
    <View style={styles.container}>
      {!capturedImage ? renderCamera() : renderEditScreen()}
    </View>
  );
};
export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: "90%",
    backgroundColor: "#000",
  },
  cameraContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: "absolute",
    bottom: 30,
    width: "100%",
    alignItems: "center",
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 5,
    borderColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  captureBtnInner: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: "#FFF",
  },
  editContainer: {
    flex: 1,
    backgroundColor: "#222",
  },
  canvasContainer: {
    flex: 1,
    position: "relative",
  },
  capturedImage: {
    flex: 1,
    resizeMode: "contain",
  },
  editTools: {
    padding: 15,
    backgroundColor: "#333",
  },
  modeSelector: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  modeButton: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 25,
    backgroundColor: "#DDD",
    marginHorizontal: 10,
  },
  activeMode: {
    backgroundColor: "#3498db",
  },
  toolOptions: {
    height: 70,
    marginBottom: 15,
  },
  colorSelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: "100%",
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedColor: {
    borderColor: "#FFF",
    transform: [{ scale: 1.2 }],
  },
  stickerSelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: "100%",
  },
  stickerOption: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#444",
    borderRadius: 10,
  },
  stickerPreview: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
  placedSticker: {
    position: "absolute",
    width: 80,
    height: 80,
    resizeMode: "contain",
  },
  captionInput: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 10,
    height: 80,
    textAlignVertical: "top",
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#e74c3c",
  },
  shareButton: {
    backgroundColor: "#3498db",
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});
