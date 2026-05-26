import os
import json
from dotenv import load_dotenv
from internetarchive import search_items, get_item

# Load API keys from .env file
load_dotenv()

IA_ACCESS_KEY = os.getenv('IA_ACCESS_KEY')
IA_SECRET_KEY = os.getenv('IA_SECRET_KEY')

if not IA_ACCESS_KEY or not IA_SECRET_KEY:
    raise ValueError("Internet Archive API keys not found in .env file.")

# Configure the internetarchive session globally
import internetarchive.config as ia_config
ia_config.get_config()['s3'] = {
    'access': IA_ACCESS_KEY,
    'secret': IA_SECRET_KEY
}


def download_islamic_texts(query="subject:islamic AND mediatype:texts", max_items=5, download_dir="../downloads"):
    """
    Searches the Internet Archive for texts related to Islam and downloads
    available text formats.
    """
    print(f"Searching Internet Archive for: {query}")
    
    # Ensure download directory exists
    os.makedirs(download_dir, exist_ok=True)
    
    # We use a general search query. In a real-world scenario, this would be highly 
    # tailored targeting specific known authentic collections.
    search = search_items(query)
    
    downloaded_count = 0
    
    for result in search:
        if downloaded_count >= max_items:
            break
            
        identifier = result['identifier']
        print(f"\nProcessing item: {identifier}")
        
        try:
            item = get_item(identifier)
            
            # Look for structured text or plain text files
            # We avoid downloading huge PDFs in this ETL script, focusing on text if possible
            formats_to_download = ['DjVuTXT', 'Text'] 
            
            download_happened = False
            for file in item.files:
                if file.get('format') in formats_to_download:
                    print(f"Downloading {file['name']} ({file['size']} bytes)...")
                    
                    item.download(
                        files=[file['name']], 
                        destdir=download_dir,
                        ignore_existing=True
                    )
                    download_happened = True
            
            if download_happened:
                # Save basic metadata for this item to a JSON file alongside the text
                metadata_path = os.path.join(download_dir, identifier, "metadata.json")
                with open(metadata_path, 'w', encoding='utf-8') as f:
                    # Strip out massive, unneeded fields from metadata for simplicity
                    clean_metadata = {
                        "title": item.metadata.get("title", ""),
                        "creator": item.metadata.get("creator", ""),
                        "date": item.metadata.get("date", ""),
                        "description": item.metadata.get("description", ""),
                        "source_url": f"https://archive.org/details/{identifier}"
                    }
                    json.dump(clean_metadata, f, indent=2, ensure_ascii=False)
                    
                downloaded_count += 1
                
        except Exception as e:
            print(f"Error processing {identifier}: {str(e)}")
            
    print(f"\nSuccessfully downloaded files for {downloaded_count} items.")

if __name__ == "__main__":
    # Test run downloading a max of 2 items just to verify the connection works
    print("Starting Internet Archive ETL Test...")
    download_islamic_texts(max_items=2)
