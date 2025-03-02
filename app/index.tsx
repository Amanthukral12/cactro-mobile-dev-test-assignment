import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Camera, CameraView } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import {
  FlipType,
  SaveFormat,
  useImageManipulator,
} from "expo-image-manipulator";
const HomeScreen = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const cameraRef = useRef<CameraView | null>(null);
  const context = capturedImage ? useImageManipulator(capturedImage) : null;

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

  const takePicture = async () => {
    if (cameraRef.current && cameraReady) {
      try {
        let photo = await cameraRef.current?.takePictureAsync();
        if (photo?.uri) {
          context?.rotate(180).flip(FlipType.Vertical);
          const image = await context?.renderAsync();
          const result = await image?.saveAsync({
            format: SaveFormat.PNG,
          });

          setCapturedImage(result ? result.uri : null);
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

  const renderPicture = () => {
    return (
      <View>
        <Image
          source={{ uri: capturedImage || "" }}
          style={{ width: 300, aspectRatio: 1 }}
        />
        <Button
          onPress={() => setCapturedImage(null)}
          title="Take another picture"
        />
      </View>
    );
  };

  const renderCamera = () => {
    if (hasPermission === null) {
      return (
        <View>
          <Text>Requesting permissions...</Text>
        </View>
      );
    }
    if (hasPermission === false) {
      return (
        <View>
          <Text>No access to camera</Text>
        </View>
      );
    }
    return (
      <CameraView
        ref={cameraRef}
        facing="front"
        onCameraReady={handleCameraReady}
        style={{ width: "100%", height: 300 }}
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
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {capturedImage ? renderPicture() : renderCamera()}
    </View>
  );
};
export default HomeScreen;

const styles = StyleSheet.create({
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
});
