import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import numpy as np

class ARRiskGRU(nn.Module):
    """
    Lightweight GRU for real-time AR Safety Risk Estimation.
    Takes a sliding window of sequential features and outputs a continuous risk score (0-1).
    """
    def __init__(self, input_dim, hidden_dim=32, num_layers=1, dropout=0.0):
        super(ARRiskGRU, self).__init__()
        
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        
        # Batch_first=True expects input shape: (batch_size, sequence_length, input_dim)
        self.gru = nn.GRU(
            input_size=input_dim, 
            hidden_size=hidden_dim, 
            num_layers=num_layers, 
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0
        )
        
        # Fully connected layers to map hidden state to risk score
        self.fc1 = nn.Linear(hidden_dim, 16)
        self.relu = nn.ReLU()
        
        # Output layer
        self.fc2 = nn.Linear(16, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        # x shape: (batch_size, sequence_length, input_dim)
        
        # Pass through GRU
        # gru_out shape: (batch_size, sequence_length, hidden_dim)
        # h_n shape: (num_layers, batch_size, hidden_dim)
        gru_out, h_n = self.gru(x)
        
        # We only care about the output of the last time step for risk estimation
        last_time_step_out = gru_out[:, -1, :] 
        
        # Feed into dense layers
        out = self.fc1(last_time_step_out)
        out = self.relu(out)
        
        # Compute final score (0.0 to 1.0)
        risk_score = self.sigmoid(self.fc2(out))
        
        return risk_score

# ==========================================
# Example usage and Dummy Data generation
# ==========================================

class RealRiskDataset(Dataset):
    """
    Loads the simulated features and risk scores from disk.
    """
    def __init__(self, pt_file_path):
        data = torch.load(pt_file_path, weights_only=True)
        self.X = data["X"]
        self.Y = data["Y"]
        
    def __len__(self):
        return len(self.X)
        
    def __getitem__(self, idx):
        return self.X[idx], self.Y[idx]

if __name__ == "__main__":
    import os
    # 1. Define hyperparameters
    INPUT_DIM = 4      # e.g., dist_to_edge, vel_x, vel_y, speed_towards_edge
    SEQ_LENGTH = 15    # e.g., 15 frames (~0.5 seconds at 30 fps)
    HIDDEN_DIM = 32
    BATCH_SIZE = 64
    
    print("Initializing Model...")
    model = ARRiskGRU(input_dim=INPUT_DIM, hidden_dim=HIDDEN_DIM)
    
    # 2. Setup loss and optimizer
    # MSE Loss is good for regression to a continuous score
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    
    # 3. Load Real Simulated Data
    data_path = os.path.join(os.path.dirname(__file__), "simulated_data.pt")
    if not os.path.exists(data_path):
        print("Please run simulate_data.py first to generate the dataset!")
        exit(1)
        
    dataset = RealRiskDataset(data_path)
    dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)
    
    print(f"\nStarting Training Loop on {len(dataset)} samples...")
    model.train()
    
    for epoch in range(1, 11):
        epoch_loss = 0.0
        for batch_idx, (inputs, targets) in enumerate(dataloader):
            # inputs shape: (BATCH_SIZE, 15, 4)
            # targets shape: (BATCH_SIZE, 1)
            
            optimizer.zero_grad()
            
            # Forward pass
            predictions = model(inputs)
            
            # Compute loss
            loss = criterion(predictions, targets)
            
            # Backward pass & optimize
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item()
            
        print(f"Epoch [{epoch}/3], Loss: {epoch_loss / len(dataloader):.4f}")
    
    print("\nTest Complete! Model architecture is valid.")
    
    # 4. Exporting to ONNX (for mobile deployment)
    # This shows how you would export it later for React Native
    dummy_input = torch.randn(1, SEQ_LENGTH, INPUT_DIM)
    torch.onnx.export(
        model, 
        dummy_input, 
        "risk_model.onnx", 
        export_params=True,
        opset_version=11,
        input_names=['input_sequence'],
        output_names=['risk_score'],
        dynamic_axes={'input_sequence': {0: 'batch_size'}, 'risk_score': {0: 'batch_size'}}
    )
    print("Exported dummy ONNX model to 'risk_model.onnx'.")
