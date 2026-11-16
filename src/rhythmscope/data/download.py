"""
Download MIT-BIH Arrhythmia Database from PhysioNet.
"""

import os
from pathlib import Path
import wfdb
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Standard 48 records of MIT-BIH Arrhythmia Database
ALL_RECORDS = [
    "100", "101", "102", "103", "104", "105", "106", "107", "108", "109",
    "111", "112", "113", "114", "115", "116", "117", "118", "119", "121",
    "122", "123", "124", "200", "201", "202", "203", "205", "207", "208",
    "209", "210", "212", "213", "214", "215", "217", "219", "220", "221",
    "222", "223", "228", "230", "231", "232", "233", "234"
]

def download_mitdb(target_dir: str = "data/raw", records: list[str] = None) -> list[str]:
    """
    Downloads MIT-BIH Arrhythmia Database records from PhysioNet.
    """
    dest = Path(target_dir)
    dest.mkdir(parents=True, exist_ok=True)
    
    if records is None:
        records = ALL_RECORDS

    logger.info(f"Target directory for MIT-BIH database: {dest.resolve()}")
    logger.info(f"Checking {len(records)} records...")
    
    downloaded = []
    for rec in records:
        hea_file = dest / f"{rec}.hea"
        dat_file = dest / f"{rec}.dat"
        atr_file = dest / f"{rec}.atr"
        
        if hea_file.exists() and dat_file.exists() and atr_file.exists():
            downloaded.append(rec)
            continue
            
        logger.info(f"Downloading record {rec} from PhysioNet...")
        try:
            # Download specific record files
            wfdb.dl_files(
                db="mitdb",
                dl_dir=str(dest),
                files=[f"{rec}.hea", f"{rec}.dat", f"{rec}.atr"],
                keep_subdirs=False
            )
            downloaded.append(rec)
        except Exception as e:
            logger.error(f"Failed to download record {rec}: {e}")
            raise
            
    logger.info(f"Successfully verified/downloaded {len(downloaded)} records in {dest}")
    return downloaded

if __name__ == "__main__":
    download_mitdb()
