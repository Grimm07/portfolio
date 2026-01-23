# Bash Cheatsheet for Intermediate Users

## Text Processing & Stream Editing

### sed (Stream Editor)
Find and replace text in files or streams without opening an editor.

```bash
# Basic substitution (first occurrence per line)
sed 's/old/new/' file.txt

# Global substitution (all occurrences)
sed 's/old/new/g' file.txt

# Edit file in-place
sed -i 's/old/new/g' file.txt

# Edit in-place with backup
sed -i.bak 's/old/new/g' file.txt

# Delete lines matching pattern
sed '/pattern/d' file.txt

# Delete lines 5-10
sed '5,10d' file.txt

# Print only lines matching pattern
sed -n '/pattern/p' file.txt

# Replace only on lines matching pattern
sed '/match/s/old/new/g' file.txt

# Multiple commands
sed -e 's/old/new/g' -e 's/foo/bar/g' file.txt
```

**When to use sed:**
- Quick find/replace operations in files
- Processing text streams in pipelines
- Automating text transformations in scripts
- Filtering log files

### awk
Pattern scanning and text processing language.

```bash
# Print specific columns
awk '{print $1, $3}' file.txt

# Print lines where column matches condition
awk '$3 > 100' file.txt

# Sum a column
awk '{sum += $1} END {print sum}' file.txt

# Custom field separator
awk -F',' '{print $1}' file.csv

# Pattern matching and action
awk '/error/ {print $0}' log.txt

# Built-in variables
awk '{print NR, NF, $0}' file.txt  # Line number, field count, whole line
```

### cut
Extract sections from lines of files.

```bash
# Cut by character position
cut -c1-10 file.txt

# Cut by field (default delimiter: tab)
cut -f1,3 file.txt

# Custom delimiter
cut -d',' -f1,2 file.csv

# All fields except specific ones
cut -d',' --complement -f3 file.csv
```

### tr
Translate or delete characters.

```bash
# Convert lowercase to uppercase
tr 'a-z' 'A-Z' < file.txt

# Delete specific characters
tr -d '[:digit:]' < file.txt

# Squeeze repeated characters
tr -s ' ' < file.txt  # Multiple spaces to single space

# Replace newlines with spaces
tr '\n' ' ' < file.txt
```

## Process Management

### Background Jobs & Job Control

```bash
# Run command in background
command &

# List background jobs
jobs

# Bring job to foreground
fg %1

# Send job to background
bg %1

# Disown job (keeps running after shell exit)
disown %1

# Run command immune to hangups
nohup command &

# View command output after nohup
tail -f nohup.out
```

### Process Information

```bash
# List all processes for current user
ps aux | grep username

# Process tree
pstree

# Real-time process monitoring
top
htop  # If available, more user-friendly

# Kill process by name
pkill process_name

# Kill all processes matching pattern
killall process_name

# Send specific signal
kill -SIGTERM PID
kill -9 PID  # Force kill (SIGKILL)
```

## File Operations

### File Permissions & Ownership

```bash
# Change file permissions (symbolic)
chmod u+x file.sh        # Add execute for user
chmod g-w file.txt       # Remove write for group
chmod o+r file.txt       # Add read for others
chmod a+x file.sh        # Add execute for all

# Change ownership
chown user:group file.txt
chown -R user:group directory/

# Change only group
chgrp group file.txt
```

### Links

```bash
# Create symbolic link
ln -s /path/to/file linkname

# Create hard link
ln /path/to/file linkname

# Show where symlink points
readlink linkname
readlink -f linkname  # Follow to absolute path
```

### File Comparison

```bash
# Compare files line by line
diff file1.txt file2.txt

# Unified diff format (easier to read)
diff -u file1.txt file2.txt

# Compare directories
diff -r dir1/ dir2/

# Side-by-side comparison
diff -y file1.txt file2.txt

# Compare three files
diff3 file1.txt file2.txt file3.txt
```

## Redirection & Pipes

```bash
# Redirect stderr to stdout
command 2>&1

# Redirect both stdout and stderr
command &> output.txt
command > output.txt 2>&1

# Append stderr to file
command 2>> error.log

# Redirect stderr to null
command 2>/dev/null

# Pipe stderr through pipeline
command 2>&1 | grep error

# Tee: write to file AND stdout
command | tee output.txt

# Tee with append
command | tee -a output.txt
```

## Command Substitution & Expansion

```bash
# Command substitution (modern)
result=$(command)

# Command substitution (legacy)
result=`command`

# Arithmetic expansion
echo $((5 + 3))
((counter++))

# Brace expansion
echo file{1..5}.txt  # file1.txt file2.txt ... file5.txt
mkdir -p dir/{sub1,sub2,sub3}

# Parameter expansion tricks
${var:-default}      # Use default if var is unset
${var:=default}      # Set var to default if unset
${var:?error}        # Exit with error if var is unset
${#var}              # Length of var
${var#pattern}       # Remove shortest match from beginning
${var##pattern}      # Remove longest match from beginning
${var%pattern}       # Remove shortest match from end
${var%%pattern}      # Remove longest match from end
${var/pattern/repl}  # Replace first match
${var//pattern/repl} # Replace all matches
```

## Loops & Conditionals

### For Loops

```bash
# Iterate over list
for item in file1 file2 file3; do
    echo "$item"
done

# Iterate over files
for file in *.txt; do
    echo "Processing $file"
done

# C-style for loop
for ((i=0; i<10; i++)); do
    echo "$i"
done

# Iterate over command output
for line in $(cat file.txt); do
    echo "$line"
done
```

### While Loops

```bash
# Basic while loop
while [ condition ]; do
    command
done

# Read file line by line (proper way)
while IFS= read -r line; do
    echo "$line"
done < file.txt

# Infinite loop
while true; do
    command
    sleep 1
done
```

### Conditionals

```bash
# File tests
[ -f file ]      # File exists and is regular file
[ -d dir ]       # Directory exists
[ -e path ]      # Path exists
[ -r file ]      # File is readable
[ -w file ]      # File is writable
[ -x file ]      # File is executable
[ -s file ]      # File has size > 0
[ file1 -nt file2 ]  # file1 newer than file2

# String tests
[ -z "$str" ]    # String is empty
[ -n "$str" ]    # String is not empty
[ "$a" = "$b" ]  # Strings are equal
[ "$a" != "$b" ] # Strings are not equal

# Numeric comparisons
[ "$a" -eq "$b" ]  # Equal
[ "$a" -ne "$b" ]  # Not equal
[ "$a" -lt "$b" ]  # Less than
[ "$a" -le "$b" ]  # Less than or equal
[ "$a" -gt "$b" ]  # Greater than
[ "$a" -ge "$b" ]  # Greater than or equal

# Modern test syntax (recommended)
[[ -f file && -r file ]]  # Supports && and ||
[[ "$str" =~ regex ]]     # Regex matching
```

## Archives & Compression

```bash
# Create tar archive
tar -czf archive.tar.gz directory/

# Extract tar archive
tar -xzf archive.tar.gz

# List contents without extracting
tar -tzf archive.tar.gz

# Create tar with bzip2
tar -cjf archive.tar.bz2 directory/

# Zip files
zip -r archive.zip directory/

# Unzip
unzip archive.zip

# Unzip to specific directory
unzip archive.zip -d /target/directory/

# gzip single file
gzip file.txt  # Creates file.txt.gz

# Decompress gzip
gunzip file.txt.gz
```

## Network & Remote Operations

```bash
# Download file
curl -O https://example.com/file.txt
wget https://example.com/file.txt

# Download with custom filename
curl -o myfile.txt https://example.com/file.txt

# Follow redirects
curl -L https://example.com

# POST request
curl -X POST -d "param=value" https://example.com/api

# SSH with port forwarding
ssh -L 8080:localhost:80 user@remote

# Copy via SSH
scp file.txt user@remote:/path/
scp -r directory/ user@remote:/path/

# Rsync (efficient sync)
rsync -avz source/ user@remote:/destination/
rsync -avz --delete source/ dest/  # Delete files in dest not in source

# Check port connectivity
nc -zv hostname 80
```

## Disk Usage & System Info

```bash
# Disk usage summary
du -sh directory/

# Disk usage of all items in directory
du -h --max-depth=1 directory/

# Disk free space
df -h

# Show inodes instead of blocks
df -i

# Sort files by size
du -sh * | sort -h

# System uptime
uptime

# Memory usage
free -h

# Show current date/time
date
date "+%Y-%m-%d %H:%M:%S"

# Show calendar
cal
```

## Useful Shortcuts & Tips

```bash
# Previous command
!!

# Last argument of previous command
!$

# All arguments of previous command
!*

# Substitute in previous command
^old^new

# Run previous command starting with 'git'
!git

# History search
Ctrl+R  # Then type to search

# Clear line
Ctrl+U

# Move to start/end of line
Ctrl+A / Ctrl+E

# Exit without saving history
kill -9 $$

# Check command type
type command
which command

# Create directory and change into it
mkdir -p new/nested/dirs && cd $_

# Run multiple commands conditionally
command1 && command2  # Run command2 only if command1 succeeds
command1 || command2  # Run command2 only if command1 fails
```

## xargs
Build and execute commands from standard input.

```bash
# Basic usage
echo "file1 file2 file3" | xargs rm

# One argument per command
cat files.txt | xargs -n1 command

# Parallel execution
cat urls.txt | xargs -P 4 -n1 curl -O

# Use placeholder
cat files.txt | xargs -I {} cp {} /backup/

# Handle spaces in filenames
find . -name "*.txt" -print0 | xargs -0 rm

# Confirm before executing
echo "file1 file2" | xargs -p rm
```

This cheatsheet focuses on intermediate-level commands that complement basic file operations and expand your command-line capabilities.