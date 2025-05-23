#!/usr/bin/env python
"""Style Profiler - Adapted from App 2 (Style Profiler)

Analyzes interview transcripts to extract stylistic and narrative fingerprints.
Generates structured profiles and chunk-level scoring for content generation.
"""

import argparse
import json
import os
import sys
from datetime import datetime
from typing import Dict, Any, List

# Import OpenAI for analysis
import openai

def setup_argparse():
    """Configure command line arguments."""
    parser = argparse.ArgumentParser(
        description="Analyze transcripts to extract stylistic and narrative fingerprints."
    )
    parser.add_argument(
        "--transcript",
        type=str,
        required=True,
        help="Path to the transcript_chunks.md file"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        required=True,
        help="Output directory for results"
    )
    parser.add_argument(
        "--client-id",
        type=str,
        required=True,
        help="Client ID for this profile"
    )
    parser.add_argument(
        "--openai-key",
        type=str,
        required=True,
        help="OpenAI API key for analysis"
    )
    
    return parser.parse_args()

def load_transcript(transcript_path: str) -> str:
    """Load and validate the transcript file."""
    if not os.path.exists(transcript_path):
        raise FileNotFoundError(f"Transcript file not found: {transcript_path}")
    
    with open(transcript_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if not content:
        raise ValueError(f"Transcript file is empty: {transcript_path}")
    
    print(f"Successfully loaded transcript from {transcript_path}")
    return content

def analyze_transcript(transcript: str, openai_key: str) -> Dict[str, Any]:
    """Run analysis on the transcript using OpenAI."""
    print("Starting transcript analysis...")
    
    # Configure OpenAI
    openai.api_key = openai_key
    
    try:
        # Define the analysis prompt
        prompt = f"""Analyze the following interview transcript and extract the client's style profile in these categories:

1. Voice: Identify 5-7 adjectives that describe the client's communication style and tone
2. Themes: Extract 5-7 key themes or topics the client focuses on
3. Values: Identify 5-7 core values or beliefs that drive the client's work
4. Emotional Tone: Describe the emotional qualities present in the client's language (5-7 items)
5. Relatability: Note 5-7 ways the client connects with their audience

For each category, provide a list of specific words or short phrases, not sentences.

Transcript:
{transcript}

Format your response as a structured JSON object with these categories as keys, and arrays of strings as values.
"""

        # Call OpenAI API
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert brand analyst who extracts style profiles from interview transcripts."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=1000
        )
        
        # Parse the response
        result_text = response.choices[0].message.content.strip()
        
        # Extract JSON from the response
        try:
            # Try to parse the entire response as JSON
            profile = json.loads(result_text)
        except json.JSONDecodeError:
            # If that fails, try to extract JSON from the text
            import re
            json_match = re.search(r'```json\n(.+?)\n```', result_text, re.DOTALL)
            if json_match:
                profile = json.loads(json_match.group(1))
            else:
                # Fallback to manual parsing
                profile = {
                    "voice": [],
                    "themes": [],
                    "values": [],
                    "emotional_tone": [],
                    "relatability": []
                }
                
                # Simple parsing based on section headers
                current_section = None
                for line in result_text.split('\n'):
                    if "voice:" in line.lower():
                        current_section = "voice"
                    elif "themes:" in line.lower():
                        current_section = "themes"
                    elif "values:" in line.lower():
                        current_section = "values"
                    elif "emotional" in line.lower() and "tone:" in line.lower():
                        current_section = "emotional_tone"
                    elif "relatability:" in line.lower():
                        current_section = "relatability"
                    elif line.strip().startswith("-") and current_section:
                        item = line.strip()[1:].strip()
                        if item:
                            profile[current_section].append(item)
        
        print("Transcript analysis completed successfully")
        return profile
        
    except Exception as e:
        print(f"Error during transcript analysis: {str(e)}")
        raise RuntimeError(f"Error during transcript analysis: {str(e)}")

def generate_profile_markdown(profile: Dict[str, Any], output_dir: str, client_id: str) -> str:
    """Generate the style-profile.md file."""
    try:
        content = [
            "# Style Profile",
            f"Client ID: {client_id}",
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n",
        ]
        
        # Add each section
        for section, items in profile.items():
            section_name = section.replace('_', ' ')
            content.extend([
                f"## {section}:",
                *[f"- {item}" for item in items],
                ""  # Empty line between sections
            ])
        
        # Join content into a single string
        markdown_content = "\n".join(content)
        
        # Create output directory if it doesn't exist
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        # Save markdown
        output_path = os.path.join(output_dir, "style-profile.md")
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        
        # Save JSON
        json_path = os.path.join(output_dir, "style-profile.json")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(profile, f, indent=2)
        
        print(f"Generated style profile: {output_path}")
        print(f"Generated style profile JSON: {json_path}")
        
        return markdown_content
        
    except Exception as e:
        print(f"Error generating markdown profile: {str(e)}")
        raise RuntimeError(f"Error generating markdown profile: {str(e)}")

def main():
    """Main entry point."""
    args = setup_argparse()
    
    try:
        # Configure OpenAI
        openai.api_key = args.openai_key
        
        # Load transcript
        transcript = load_transcript(args.transcript)
        
        # Analyze transcript
        profile = analyze_transcript(transcript, args.openai_key)
        
        # Generate profile markdown
        generate_profile_markdown(profile, args.output_dir, args.client_id)
        
        print("Style profiling completed successfully")
        return 0
    except Exception as e:
        print(f"Error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
