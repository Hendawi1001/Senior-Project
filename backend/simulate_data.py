import numpy as np
import math
import torch
import os

# Define the physical boundary of the room (e.g., a 5x5 meter area centered at 0,0)
ROOM_MIN_X, ROOM_MAX_X = -2.5, 2.5
ROOM_MIN_Y, ROOM_MAX_Y = -2.5, 2.5

# At what distance (in meters) from the boundary does the user start being at risk?
SAFE_THRESHOLD = 1.0 

def generate_walking_path(num_steps, dt=0.033):
    """
    Generates a realistic 2D walking path using a random walk with momentum.
    dt = 0.033 corresponds to approx 30 fps (standard ARCore camera frame rate).
    """
    positions = []
    velocities = []
    
    # Start in the center of the room, standing still
    x, y = 0.0, 0.0
    vx, vy = 0.0, 0.0
    
    for _ in range(num_steps):
        # Add random acceleration to simulate human steps/changes in direction
        ax = np.random.normal(0, 0.8)
        ay = np.random.normal(0, 0.8)
        
        # Update velocity with damping (friction) to prevent infinite speeds
        vx = vx * 0.92 + ax * dt
        vy = vy * 0.92 + ay * dt
        
        # Cap max speed to roughly human running speed (e.g., 3.0 m/s)
        speed = math.hypot(vx, vy)
        if speed > 3.0:
            vx = (vx / speed) * 3.0
            vy = (vy / speed) * 3.0
            
        # Update position
        x += vx * dt
        y += vy * dt
        
        # Soft bounce off the walls to keep the simulation mostly inside the room
        if x < ROOM_MIN_X: x = ROOM_MIN_X; vx *= -0.5
        if x > ROOM_MAX_X: x = ROOM_MAX_X; vx *= -0.5
        if y < ROOM_MIN_Y: y = ROOM_MIN_Y; vy *= -0.5
        if y > ROOM_MAX_Y: y = ROOM_MAX_Y; vy *= -0.5
            
        positions.append((x, y))
        velocities.append((vx, vy))
        
    return np.array(positions), np.array(velocities)

def calculate_features_and_labels(positions, velocities):
    """
    Extract neural network features (distances, speeds) from raw coordinates
    and compute the ground-truth "Risk Score" label for training.
    """
    features = []
    labels = []
    
    for (x, y), (vx, vy) in zip(positions, velocities):
        # 1. Calculate distance to nearest boundary line
        dist_left = x - ROOM_MIN_X
        dist_right = ROOM_MAX_X - x
        dist_bottom = y - ROOM_MIN_Y
        dist_top = ROOM_MAX_Y - y
        
        dist_to_edge = min(dist_left, dist_right, dist_bottom, dist_top)
        
        # 2. Calculate speed moving TOWARDS the boundary
        speed_towards_edge = 0.0
        if dist_to_edge == dist_left and vx < 0:
            speed_towards_edge = abs(vx)
        elif dist_to_edge == dist_right and vx > 0:
            speed_towards_edge = abs(vx)
        elif dist_to_edge == dist_bottom and vy < 0:
            speed_towards_edge = abs(vy)
        elif dist_to_edge == dist_top and vy > 0:
            speed_towards_edge = abs(vy)
            
        # Construct the 4-dimensional feature vector for this frame
        feat = [dist_to_edge, vx, vy, speed_towards_edge]
        features.append(feat)
        
        # ---------------------------------------------------------
        # CALCULATE HEURISTIC LABEL (Risk Score 0.0 to 1.0)
        # ---------------------------------------------------------
        # Base risk from distance: 0% if > 1m away, scales up to 100% as distance approaches 0m.
        if dist_to_edge > SAFE_THRESHOLD:
            risk = 0.0
        else:
            risk = 1.0 - (dist_to_edge / SAFE_THRESHOLD)
            
        # Add additional risk if they are actively moving FAST towards the edge
        # E.g., moving at 1.5 m/s towards the edge adds 30% risk (0.3)
        risk += (speed_towards_edge * 0.2)
        
        # Clamp score between 0.0 (Safe) and 1.0 (Danger)
        risk = max(0.0, min(1.0, risk))
        labels.append([risk])
        
    return np.array(features, dtype=np.float32), np.array(labels, dtype=np.float32)

def create_sliding_windows(features, labels, seq_length=15):
    """
    Convert the continuous timeseries into overlapping windows for the GRU model.
    Shape becomes: (Batch_Size, Sequence_Length, Features)
    """
    X, Y = [], []
    for i in range(len(features) - seq_length):
        # Extract the sequence of N frames
        X.append(features[i : i + seq_length])
        
        # The target label is the risk at the END of this window
        Y.append(labels[i + seq_length - 1])
        
    return np.array(X), np.array(Y)

if __name__ == "__main__":
    print("Simulating 15,000 frames of walking data (~8.3 minutes at 30fps)...")
    positions, velocities = generate_walking_path(15000, dt=0.033)
    
    print("Calculating features and ground-truth risk labels...")
    features, labels = calculate_features_and_labels(positions, velocities)
    
    print("Creating sliding windows (Sequence Length = 15)...")
    X, Y = create_sliding_windows(features, labels, seq_length=15)
    
    print(f"\nGenerated Dataset Shape:")
    print(f"X (Inputs): {X.shape} -> (Samples, Frames, Features)")
    print(f"Y (Labels): {Y.shape} -> (Samples, Output)")
    
    # Save as PyTorch tensors so we can load them easily in the training script
    save_path = os.path.join(os.path.dirname(__file__), "simulated_data.pt")
    torch.save({"X": torch.tensor(X), "Y": torch.tensor(Y)}, save_path)
    print(f"\nSuccessfully saved dataset to '{save_path}'!")
