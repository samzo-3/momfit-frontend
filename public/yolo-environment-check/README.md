# YOLO environment check assets

`yolo11n.onnx` is a YOLO11n ONNX model exported at input size 640. Regenerate it with:

```bash
pip install ultralytics
yolo export model=yolo11n.pt format=onnx imgsz=640
```

Before deployment, verify HTTPS camera access, Vite base paths, browser WebGPU/WASM support, and model licensing.
