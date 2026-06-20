import re
import time
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# In-memory cache for release notes
# Structure: {'data': [...], 'timestamp': 0.0}
FEED_CACHE = {
    'data': None,
    'timestamp': 0.0
}
CACHE_DURATION_SEC = 300  # 5 minutes

def strip_html_tags(html):
    """Strip HTML tags and convert to plain text for tweets."""
    text = html
    # Replace block elements and lists with newlines
    text = re.sub(r'</?(p|div|h1|h2|h3|h4|h5|h6)[^>]*>', '\n', text)
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'<li[^>]*>', '• ', text)
    text = re.sub(r'</li>', '\n', text)
    # Strip remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode basic HTML entities
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = text.replace('&amp;', '&')
    text = text.replace('&quot;', '"')
    text = text.replace('&#39;', "'")
    # Clean up multiple whitespaces/newlines
    lines = [line.strip() for line in text.split('\n')]
    cleaned_lines = []
    for line in lines:
        if line:
            # Collapse multiple spaces
            line = re.sub(r'\s+', ' ', line)
            cleaned_lines.append(line)
    return "\n".join(cleaned_lines)

def parse_entry_content(content_html):
    """Split a single feed entry's HTML content by <h3> tags to extract sub-updates."""
    # Split content by <h3>...</h3> tags
    parts = re.split(r'(<h3>.*?</h3>)', content_html, flags=re.DOTALL)
    
    sub_items = []
    current_type = "General"
    current_body = []
    
    i = 0
    while i < len(parts):
        part = parts[i].strip()
        if not part:
            i += 1
            continue
        
        # Check if part is an <h3> tag
        h3_match = re.match(r'^<h3>(.*?)</h3>$', part, flags=re.IGNORECASE)
        if h3_match:
            # Save the previous sub-item if we accumulated body text
            if current_body:
                body_html = "\n".join(current_body).strip()
                sub_items.append({
                    'type': current_type,
                    'html': body_html,
                    'text': strip_html_tags(body_html)
                })
                current_body = []
            current_type = h3_match.group(1).strip()
        else:
            current_body.append(part)
        i += 1
        
    # Append the last sub-item
    if current_body:
        body_html = "\n".join(current_body).strip()
        sub_items.append({
            'type': current_type,
            'html': body_html,
            'text': strip_html_tags(body_html)
        })
        
    # Fallback if no <h3> tags were found at all
    if not sub_items and content_html.strip():
        sub_items.append({
            'type': 'General',
            'html': content_html.strip(),
            'text': strip_html_tags(content_html)
        })
        
    return sub_items

def fetch_and_parse_feed(force_refresh=False):
    """Fetch the BigQuery release notes Atom feed and parse it."""
    global FEED_CACHE
    
    now = time.time()
    if not force_refresh and FEED_CACHE['data'] is not None and (now - FEED_CACHE['timestamp'] < CACHE_DURATION_SEC):
        return FEED_CACHE['data']
        
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read()
    except Exception as e:
        # Fallback to cache if request fails, otherwise re-raise
        if FEED_CACHE['data'] is not None:
            return FEED_CACHE['data']
        raise RuntimeError(f"Failed to fetch feed: {str(e)}")
        
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    parsed_notes = []
    entry_index = 0
    
    for entry in root.findall('atom:entry', ns):
        title = entry.find('atom:title', ns)
        entry_id = entry.find('atom:id', ns)
        updated = entry.find('atom:updated', ns)
        
        # Link extraction (look for rel='alternate' first, then any link)
        link = entry.find("atom:link[@rel='alternate']", ns)
        if link is None:
            link = entry.find("atom:link", ns)
        link_href = link.attrib.get('href', '') if link is not None else ''
        
        content = entry.find('atom:content', ns)
        
        title_text = title.text if title is not None else 'Unknown Date'
        id_text = entry_id.text if entry_id is not None else f'entry-{entry_index}'
        updated_text = updated.text if updated is not None else ''
        content_html = content.text if content is not None else ''
        
        # Parse content into distinct sub-updates (Feature, Change, Deprecation, etc.)
        sub_updates = parse_entry_content(content_html)
        
        for sub_index, sub in enumerate(sub_updates):
            parsed_notes.append({
                'id': f"{id_text}_{sub_index}",
                'date': title_text,
                'timestamp': updated_text,
                'link': link_href,
                'type': sub['type'],
                'html': sub['html'],
                'text': sub['text']
            })
            
        entry_index += 1
        
    FEED_CACHE['data'] = parsed_notes
    FEED_CACHE['timestamp'] = now
    return parsed_notes

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/release-notes')
def api_release_notes():
    force = request.args.get('refresh', 'false').lower() == 'true'
    try:
        notes = fetch_and_parse_feed(force_refresh=force)
        return jsonify({
            'success': True,
            'notes': notes,
            'cached_at': FEED_CACHE['timestamp'],
            'from_cache': not force and (time.time() - FEED_CACHE['timestamp'] < CACHE_DURATION_SEC)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Start on standard port 5000
    app.run(debug=True, port=5000)
