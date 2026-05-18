import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np

# 1. Simulate a Dataset of Medical Vitals
# Features: [Heart Rate (BPM), SpO2 (Oxygen), Age]
# Label: Cardiac Risk Percentage (0.0 to 1.0)
print("Simulating 10,000 medical patient records...")
num_samples = 10000
features = []
labels = []

for _ in range(num_samples):
    # Simulate realistic random features
    bpm = np.random.uniform(40, 200)
    spo2 = np.random.uniform(80, 100)
    age = np.random.uniform(18, 90)
    
    # Heuristic true risk calculation (just for generating the training dataset)
    risk = 0.0
    
    # High or very low heart rate increases risk
    if bpm > 100:
        risk += (bpm - 100) * 0.01
    elif bpm < 60:
        risk += (60 - bpm) * 0.015
        
    # Low oxygen heavily increases risk
    if spo2 < 95:
        risk += (95 - spo2) * 0.02
        
    # Older age gives a higher baseline risk
    risk += (age / 100) * 0.1
    
    # Cap between 0% and 100%
    risk = min(max(risk, 0.0), 1.0)
    
    features.append([bpm, spo2, age])
    labels.append([risk])

X = torch.tensor(features, dtype=torch.float32)
y = torch.tensor(labels, dtype=torch.float32)

# Normalize the features for better Neural Network training
# (We will apply these same normalizations in the Django API)
mean = X.mean(dim=0)
std = X.std(dim=0)
X_norm = (X - mean) / std

# 2. Define the Deep Learning Neural Network
class CardiacRiskNN(nn.Module):
    def __init__(self):
        super(CardiacRiskNN, self).__init__()
        # Input layer (3 features) -> Hidden layers -> Output (1 Risk Score)
        self.network = nn.Sequential(
            nn.Linear(3, 16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Linear(8, 1),
            nn.Sigmoid() # Squashes output exactly between 0.0 and 1.0
        )

    def forward(self, x):
        return self.network(x)

# 3. Train the Model
model = CardiacRiskNN()
criterion = nn.MSELoss()
optimizer = optim.Adam(model.parameters(), lr=0.01)

epochs = 150
batch_size = 64
print("\nStarting Deep Learning Training...")

for epoch in range(epochs):
    # Shuffle data
    permutation = torch.randperm(X_norm.size()[0])
    for i in range(0, X_norm.size()[0], batch_size):
        indices = permutation[i:i+batch_size]
        batch_X, batch_y = X_norm[indices], y[indices]

        # Forward pass
        predictions = model(batch_X)
        loss = criterion(predictions, batch_y)

        # Backward pass
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        
    if (epoch + 1) % 30 == 0:
        print(f"Epoch [{epoch+1}/{epochs}], Loss: {loss.item():.4f}")

print("\nTraining Complete! Neural Network learned the complex health patterns.")

# 4. Export to ONNX for Django Production deployment
print("Exporting model to ONNX format...")
dummy_input = torch.randn(1, 3) # 1 sample, 3 features

# Use legacy export API to avoid Windows unicode issues
import warnings
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    torch.onnx.export(
        model,
        dummy_input,
        "cardiac_model.onnx",
        export_params=True,
        opset_version=11,
        do_constant_folding=True,
        input_names=['vitals'],
        output_names=['risk_score'],
        verbose=False
    )

# Save normalization constants so the Django API knows how to scale live data
norm_data = {
    "mean": mean.numpy().tolist(),
    "std": std.numpy().tolist()
}
import json
with open("cardiac_norm_stats.json", "w") as f:
    json.dump(norm_data, f)

print("Export successful! Saved 'cardiac_model.onnx' and 'cardiac_norm_stats.json'.")
