/**
 * Transcript Service
 * 
 * Handles processing of interview transcripts
 * Adapted from App 1 (Transcript Builder)
 */

const { PythonShell } = require('python-shell');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Transcript = require('../../models/transcript');

class TranscriptService {
  constructor() {
    // Create necessary directories
    this.setupDirectories();
  }

  /**
   * Set up necessary directories for transcript processing
   */
  setupDirectories() {
    const dirs = [
      path.join(__dirname, 'temp'),
      path.join(__dirname, 'output'),
      path.join(__dirname, 'uploads'),
      path.join(__dirname, 'scripts')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Process uploaded files (video, audio, subtitle)
   * @param {string} transcriptId - MongoDB ID of the transcript
   * @param {Object} files - Uploaded files
   * @returns {Promise<Object>} - Processing result
   */
  async processUploadedFiles(transcriptId, files) {
    return new Promise(async (resolve, reject) => {
      try {
        const transcript = await Transcript.findById(transcriptId);
        if (!transcript) {
          return reject(new Error('Transcript not found'));
        }

        // Create temp directory for this transcript
        const tempDir = path.join(__dirname, 'temp', transcriptId.toString());
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // Copy uploaded files to temp directory
        const filePaths = {};
        
        if (files.video && files.video.length > 0) {
          const videoPath = path.join(tempDir, 'input.mp4');
          fs.copyFileSync(files.video[0].path, videoPath);
          filePaths.video = videoPath;
        }
        
        if (files.audio && files.audio.length > 0) {
          const audioPath = path.join(tempDir, 'input.m4a');
          fs.copyFileSync(files.audio[0].path, audioPath);
          filePaths.audio = audioPath;
        }
        
        if (files.subtitle && files.subtitle.length > 0) {
          const subtitlePath = path.join(tempDir, 'input.vtt');
          fs.copyFileSync(files.subtitle[0].path, subtitlePath);
          filePaths.subtitle = subtitlePath;
        }

        // Determine processing mode
        const mode = filePaths.subtitle ? 'vtt' : 'whisper';
        
        // Create Python script to process transcript
        await this.createTranscriptProcessorScript();
        
        // Run Python script
        const options = {
          mode: 'text',
          pythonPath: 'python', // Adjust based on your environment
          pythonOptions: ['-u'], // unbuffered output
          scriptPath: path.join(__dirname, 'scripts'),
          args: [
            '--mode', mode,
            '--temp-dir', tempDir,
            '--output-dir', path.join(__dirname, 'output', transcriptId.toString()),
            '--client-id', transcript.clientId
          ]
        };
        
        if (filePaths.video) {
          options.args.push('--video', filePaths.video);
        }
        
        if (filePaths.audio) {
          options.args.push('--audio', filePaths.audio);
        }
        
        if (filePaths.subtitle) {
          options.args.push('--subtitle', filePaths.subtitle);
        }

        PythonShell.run('process_transcript.py', options, async (err, results) => {
          if (err) {
            console.error('Error running transcript processor:', err);
            return reject(err);
          }
          
          // Parse results
          const outputDir = path.join(__dirname, 'output', transcriptId.toString());
          const chunksFile = path.join(outputDir, 'transcript_chunks.json');
          
          if (!fs.existsSync(chunksFile)) {
            return reject(new Error('Transcript processing failed: No chunks file generated'));
          }
          
          const chunks = JSON.parse(fs.readFileSync(chunksFile, 'utf8'));
          
          // Clean up temp files
          this.cleanupTempFiles(tempDir);
          
          resolve({
            chunks,
            metadata: {
              mode,
              processingTime: new Date().toISOString(),
              chunkCount: chunks.length
            }
          });
        });
      } catch (error) {
        console.error('Error processing uploaded files:', error);
        reject(error);
      }
    });
  }

  /**
   * Process Vapi transcript
   * @param {string} transcriptId - MongoDB ID of the transcript
   * @param {string} transcriptText - Raw transcript text from Vapi
   * @returns {Promise<Object>} - Processing result
   */
  async processVapiTranscript(transcriptId, transcriptText) {
    return new Promise(async (resolve, reject) => {
      try {
        const transcript = await Transcript.findById(transcriptId);
        if (!transcript) {
          return reject(new Error('Transcript not found'));
        }

        // Create temp directory for this transcript
        const tempDir = path.join(__dirname, 'temp', transcriptId.toString());
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // Write transcript to file
        const transcriptFile = path.join(tempDir, 'vapi_transcript.txt');
        fs.writeFileSync(transcriptFile, transcriptText, 'utf8');

        // Create Python script to process transcript
        await this.createTranscriptProcessorScript();
        
        // Run Python script
        const options = {
          mode: 'text',
          pythonPath: 'python', // Adjust based on your environment
          pythonOptions: ['-u'], // unbuffered output
          scriptPath: path.join(__dirname, 'scripts'),
          args: [
            '--mode', 'vapi',
            '--temp-dir', tempDir,
            '--output-dir', path.join(__dirname, 'output', transcriptId.toString()),
            '--client-id', transcript.clientId,
            '--transcript', transcriptFile
          ]
        };

        PythonShell.run('process_transcript.py', options, async (err, results) => {
          if (err) {
            console.error('Error running transcript processor:', err);
            return reject(err);
          }
          
          // Parse results
          const outputDir = path.join(__dirname, 'output', transcriptId.toString());
          const chunksFile = path.join(outputDir, 'transcript_chunks.json');
          
          if (!fs.existsSync(chunksFile)) {
            return reject(new Error('Transcript processing failed: No chunks file generated'));
          }
          
          const chunks = JSON.parse(fs.readFileSync(chunksFile, 'utf8'));
          
          // Clean up temp files
          this.cleanupTempFiles(tempDir);
          
          resolve({
            chunks,
            metadata: {
              mode: 'vapi',
              processingTime: new Date().toISOString(),
              chunkCount: chunks.length
            }
          });
        });
      } catch (error) {
        console.error('Error processing Vapi transcript:', error);
        reject(error);
      }
    });
  }

  /**
   * Create Python script for transcript processing
   * Adapted from App 1 (Transcript Builder)
   */
  async createTranscriptProcessorScript() {
    const scriptPath = path.join(__dirname, 'scripts', 'process_transcript.py');
    
    // Only create if it doesn't exist
    if (fs.existsSync(scriptPath)) {
      return;
    }
    
    const scriptContent = `#!/usr/bin/env python
"""
Transcript Processor - Adapted from App 1 (Transcript Builder)
Processes interview transcripts into structured chunks
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from typing import List, Dict

def setup_argparse():
    """Configure command line arguments."""
    parser = argparse.ArgumentParser(
        description="Process interview transcripts into structured chunks"
    )
    parser.add_argument(
        "--mode",
        type=str,
        choices=["vtt", "whisper", "vapi"],
        required=True,
        help="Processing mode: vtt, whisper, or vapi"
    )
    parser.add_argument(
        "--temp-dir",
        type=str,
        required=True,
        help="Temporary directory for processing"
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
        help="Client ID for this transcript"
    )
    parser.add_argument(
        "--video",
        type=str,
        help="Path to input video file (for vtt or whisper mode)"
    )
    parser.add_argument(
        "--audio",
        type=str,
        help="Path to input audio file (for vtt or whisper mode)"
    )
    parser.add_argument(
        "--subtitle",
        type=str,
        help="Path to input subtitle file (for vtt mode)"
    )
    parser.add_argument(
        "--transcript",
        type=str,
        help="Path to input transcript file (for vapi mode)"
    )
    
    return parser.parse_args()

def process_vtt_mode(args):
    """Process transcript using VTT file."""
    print(f"Processing in VTT mode")
    
    if not args.subtitle:
        raise ValueError("Subtitle file is required for VTT mode")
    
    # Read VTT file
    with open(args.subtitle, 'r', encoding='utf-8') as f:
        vtt_content = f.read()
    
    # Parse VTT content
    chunks = parse_vtt(vtt_content)
    
    return chunks

def process_whisper_mode(args):
    """Process transcript using Whisper for transcription."""
    print(f"Processing in Whisper mode")
    
    if not args.video and not args.audio:
        raise ValueError("Video or audio file is required for Whisper mode")
    
    # For now, we'll just create a simple placeholder
    # In a real implementation, you would use Whisper to transcribe the audio
    chunks = [
        {
            "id": "chunk_001",
            "text": "This is a placeholder for Whisper transcription.",
            "start": 0,
            "end": 10
        }
    ]
    
    return chunks

def process_vapi_mode(args):
    """Process transcript from Vapi.ai."""
    print(f"Processing in Vapi mode")
    
    if not args.transcript:
        raise ValueError("Transcript file is required for Vapi mode")
    
    # Read transcript file
    with open(args.transcript, 'r', encoding='utf-8') as f:
        transcript_content = f.read()
    
    # Parse Vapi transcript
    chunks = parse_vapi_transcript(transcript_content)
    
    return chunks

def parse_vtt(vtt_content: str) -> List[Dict]:
    """Parse VTT content into chunks."""
    # Simple VTT parser - in a real implementation, this would be more robust
    chunks = []
    
    # Regular expression to match VTT cues
    pattern = r'(\\d{2}:\\d{2}:\\d{2}.\\d{3}) --> (\\d{2}:\\d{2}:\\d{2}.\\d{3})\\n(Speaker 2: )?(.*?)(?=\\n\\n|$)'
    matches = re.finditer(pattern, vtt_content, re.DOTALL)
    
    for i, match in enumerate(matches):
        start_time = match.group(1)
        end_time = match.group(2)
        text = match.group(4).strip()
        
        # Only include Speaker 2 (client) responses
        if match.group(3) or 'Speaker 2:' in text:
            # Convert time to seconds
            start_seconds = time_to_seconds(start_time)
            end_seconds = time_to_seconds(end_time)
            
            # Clean up text
            text = text.replace('Speaker 2:', '').strip()
            
            chunks.append({
                "id": f"chunk_{i+1:03d}",
                "text": text,
                "start": start_seconds,
                "end": end_seconds
            })
    
    return chunks

def parse_vapi_transcript(transcript_content: str) -> List[Dict]:
    """Parse Vapi transcript into chunks."""
    # Split transcript by speaker turns
    lines = transcript_content.split('\\n')
    chunks = []
    current_chunk = {"text": "", "speaker": ""}
    chunk_id = 1
    
    for line in lines:
        if line.startswith("AI:"):
            # This is the interviewer
            if current_chunk["text"] and current_chunk["speaker"] == "Client":
                # Save previous client chunk
                chunks.append({
                    "id": f"chunk_{chunk_id:03d}",
                    "text": current_chunk["text"].strip(),
                    "start": 0,  # We don't have timestamps from Vapi
                    "end": 0
                })
                chunk_id += 1
            
            current_chunk = {"text": line[3:].strip(), "speaker": "AI"}
        elif line.startswith("Human:") or line.startswith("Client:"):
            # This is the client
            if current_chunk["text"] and current_chunk["speaker"] == "Client":
                # Append to current client chunk
                current_chunk["text"] += " " + line[line.find(":")+1:].strip()
            else:
                # Start new client chunk
                if current_chunk["text"] and current_chunk["speaker"] == "Client":
                    chunks.append({
                        "id": f"chunk_{chunk_id:03d}",
                        "text": current_chunk["text"].strip(),
                        "start": 0,
                        "end": 0
                    })
                    chunk_id += 1
                
                current_chunk = {"text": line[line.find(":")+1:].strip(), "speaker": "Client"}
        else:
            # Continuation of previous speaker
            if current_chunk["text"]:
                current_chunk["text"] += " " + line.strip()
    
    # Add the last chunk if it's from the client
    if current_chunk["text"] and current_chunk["speaker"] == "Client":
        chunks.append({
            "id": f"chunk_{chunk_id:03d}",
            "text": current_chunk["text"].strip(),
            "start": 0,
            "end": 0
        })
    
    return chunks

def time_to_seconds(time_str: str) -> float:
    """Convert VTT time format to seconds."""
    h, m, s = time_str.split(':')
    return int(h) * 3600 + int(m) * 60 + float(s)

def write_output(chunks: List[Dict], output_dir: str, client_id: str):
    """Write output files."""
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Write chunks to JSON file
    chunks_file = os.path.join(output_dir, 'transcript_chunks.json')
    with open(chunks_file, 'w', encoding='utf-8') as f:
        json.dump(chunks, f, indent=2)
    
    # Write chunks to markdown file
    md_file = os.path.join(output_dir, 'transcript_chunks.md')
    with open(md_file, 'w', encoding='utf-8') as f:
        f.write(f"# Transcript Chunks for {client_id}\\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\\n\\n")
        
        for chunk in chunks:
            f.write(f"## {chunk['id']}\\n")
            f.write(f"{chunk['text']}\\n\\n")
    
    print(f"Output written to {output_dir}")
    print(f"- JSON: {chunks_file}")
    print(f"- Markdown: {md_file}")

def main():
    """Main entry point."""
    args = setup_argparse()
    
    try:
        # Process based on mode
        if args.mode == "vtt":
            chunks = process_vtt_mode(args)
        elif args.mode == "whisper":
            chunks = process_whisper_mode(args)
        elif args.mode == "vapi":
            chunks = process_vapi_mode(args)
        else:
            raise ValueError(f"Unknown mode: {args.mode}")
        
        # Write output
        write_output(chunks, args.output_dir, args.client_id)
        
        print("Processing completed successfully")
        return 0
    except Exception as e:
        print(f"Error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
`;
    
    fs.writeFileSync(scriptPath, scriptContent, 'utf8');
    fs.chmodSync(scriptPath, '755'); // Make executable
  }

  /**
   * Clean up temporary files
   * @param {string} tempDir - Temporary directory to clean
   */
  cleanupTempFiles(tempDir) {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }
}

module.exports = new TranscriptService();
