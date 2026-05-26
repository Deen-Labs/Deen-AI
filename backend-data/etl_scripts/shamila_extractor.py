import os
import sqlite3
import json
from pathlib import Path
from dotenv import load_dotenv

# Load paths from .env
load_dotenv()
SHAMILA_DB_PATH = os.getenv('SHAMILA_DB_PATH', '../downloads/shamila')

def extract_from_sqlite(db_file, output_dir):
    """
    Extracts book metadata and text content from a Maktaba Shamila SQLite database.
    """
    db_path = Path(db_file)
    if not db_path.exists():
        print(f"Database file not found: {db_file}")
        return

    print(f"Connecting to database: {db_file}")
    
    # Connect to the SQLite database
    # Note: The exact schema might vary slightly depending on the Shamila version.
    # We use a standard expected structure here.
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()
    
    # 1. Try to get book metadata
    book_info = {"title": "Unknown Book", "author": "Unknown Author"}
    try:
        cursor.execute("SELECT bkid, bk, auth FROM main WHERE bkid IS NOT NULL LIMIT 1")
        row = cursor.fetchone()
        if row:
            bkid, title, author = row
            book_info = {"bkid": bkid, "title": title, "author": author}
            print(f"Found book: {title} by {author}")
    except sqlite3.OperationalError:
        print("Warning: Expected metadata table structure not found. Proceeding with default metadata.")
        
    # Create an output directory for this book
    safe_title = "".join([c for c in book_info["title"] if c.isalpha() or c.isdigit() or c==' ']).rstrip()
    if not safe_title:
         safe_title = f"book_{Path(db_file).stem}"
         
    book_dir = Path(output_dir) / safe_title
    book_dir.mkdir(parents=True, exist_ok=True)
    
    # Save the metadata
    with open(book_dir / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(book_info, f, indent=2, ensure_ascii=False)

    # 2. Extract the text content
    print("Extracting text chapters...")
    try:
        # Assuming a table 't<bkid>' or 'book' or 'b' exists with columns 'id', 'tit', 'nass' (text)
        # We will try a few common naming conventions
        
        table_name = None
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        # Look for tables that likely hold the book body text
        for t in tables:
             name = t[0].lower()
             if name.startswith('t') and name[1:].isdigit():  # e.g. t1234
                 table_name = name
                 break
             elif name in ['book', 'b', 'nass']:
                 table_name = name
                 break
                 
        if not table_name:
             print("Could not identify the main text table in this database.")
             return
             
        cursor.execute(f"SELECT id, tit, nass FROM {table_name} ORDER BY id")
        chapters = cursor.fetchall()
        
        extracted_count = 0
        with open(book_dir / "content.txt", "w", encoding="utf-8") as f:
            for chapter in chapters:
                chapter_id, chapter_title, text_body = chapter
                
                # Write a header for the chapter
                f.write(f"\n\n--- Chapter: {chapter_title or 'Untitled Section'} ---\n\n")
                
                # Write the actual text
                if text_body:
                    # Basic cleaning: remove common HTML/Shamila tags if they exist
                    clean_text = text_body.replace('<br>', '\n').replace('</br>', '\n')
                    f.write(clean_text)
                
                extracted_count += 1
                
        print(f"Successfully extracted {extracted_count} sections to {book_dir}/content.txt")

    except sqlite3.OperationalError as e:
        print(f"Error reading chapters: {e}")
    finally:
        conn.close()

def batch_process_directory(directory=".", output_dir="../extracted_data"):
    """
    Finds all SQLite files in the given directory and runs extraction on them.
    """
    search_path = Path(directory)
    print(f"Scanning for SQLite databases in {search_path.absolute()}...")
    
    # Look for both .sqlite and .db files
    sqlite_files = list(search_path.rglob("*.sqlite")) + list(search_path.rglob("*.db"))
    
    if not sqlite_files:
         print(f"No SQLite databases found in {directory}.")
         print("Note: If you have .bok files, they need to be converted to SQLite first, or we need a .bok parser.")
         return
         
    for db_file in sqlite_files:
         extract_from_sqlite(db_file, output_dir)
         print("-" * 40)

if __name__ == "__main__":
    target_dir = SHAMILA_DB_PATH
    output_dir = Path(__file__).parent.parent / "extracted_data"
    
    print("Starting Maktaba Shamila Extraction Script...")
    batch_process_directory(target_dir, output_dir)
