// Clear Supabase Storage Bucket
// Use the SQL approach to clear storage references, then manually delete from dashboard

console.log('Storage bucket should be cleared manually from Supabase dashboard.')
console.log('Steps:')
console.log('1. Go to https://supabase.com/dashboard/project/ipaquntaeftocyvxoawo/storage/buckets/project-files')
console.log('2. Select all files/folders in the bucket')
console.log('3. Click Delete')
console.log('4. Confirm deletion')
console.log('')
console.log('Since we already deleted all database records, the storage files are now orphaned and safe to delete.')
process.exit(0)

async function clearStorageBucket() {
  try {
    console.log('Listing all files in project-files bucket...')
    
    // List all files in the bucket
    const { data: files, error: listError } = await supabase.storage
      .from('project-files')
      .list('', {
        limit: 1000,
        offset: 0
      })

    if (listError) {
      console.error('Error listing files:', listError)
      return
    }

    if (!files || files.length === 0) {
      console.log('No files found in bucket - already empty!')
      return
    }

    console.log(`Found ${files.length} files/folders to delete`)

    // Get all file paths (including nested files)
    const allPaths = []
    
    for (const item of files) {
      if (item.name) {
        // If it's a folder, list its contents
        const { data: folderFiles, error: folderError } = await supabase.storage
          .from('project-files')
          .list(item.name, {
            limit: 1000,
            offset: 0
          })

        if (!folderError && folderFiles) {
          for (const file of folderFiles) {
            if (file.name) {
              allPaths.push(`${item.name}/${file.name}`)
            }
          }
        } else {
          // It's a direct file
          allPaths.push(item.name)
        }
      }
    }

    console.log(`Total files to delete: ${allPaths.length}`)

    if (allPaths.length > 0) {
      // Delete all files
      const { data: deleteData, error: deleteError } = await supabase.storage
        .from('project-files')
        .remove(allPaths)

      if (deleteError) {
        console.error('Error deleting files:', deleteError)
        return
      }

      console.log(`Successfully deleted ${allPaths.length} files`)
      console.log('Storage bucket is now empty!')
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

clearStorageBucket()