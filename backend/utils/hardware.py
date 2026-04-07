import subprocess
import re

def check_hardware() -> dict:
    # Auto-detect available VRAM via subprocess nvidia-smi call
    vram_total_mb = 0
    vram_used_mb = 0
    vram_free_mb = 0
    gpu_utilization = 0
    use_gpu = False
    
    try:
        # Query total, used, free and utilization
        result = subprocess.run(
            ['nvidia-smi', '--query-gpu=memory.total,memory.used,memory.free,utilization.gpu', '--format=csv,noheader,nounits'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')
            if lines:
                parts = [p.strip() for p in lines[0].split(',')]
                if len(parts) >= 4:
                    vram_total_mb = int(parts[0])
                    vram_used_mb = int(parts[1])
                    vram_free_mb = int(parts[2])
                    gpu_utilization = int(parts[3])
                    use_gpu = True
    except FileNotFoundError:
        pass
    except Exception:
        pass
        
    vram_available_gb = vram_free_mb / 1024.0
    
    # If VRAM < 3GB available, set num_gpu=0 in Ollama
    if use_gpu and vram_available_gb < 3.0:
        use_gpu = False
        
    return {
        "vram_available_gb": round(vram_available_gb, 2),
        "vram_total_gb": round(vram_total_mb / 1024.0, 2),
        "vram_used_gb": round(vram_used_mb / 1024.0, 2),
        "gpu_utilization": gpu_utilization,
        "use_gpu": use_gpu
    }
