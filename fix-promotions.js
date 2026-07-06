import fs from 'fs';

let content = fs.readFileSync('src/pages/school-admin/Promotions.tsx', 'utf8');

const targetRegex = /try \{\s*const \{ data: updateData, error: updateError \} = await supabase\.from\('student_sections'\)\s*\.update\(\{ section_id: targetSectionId \}\)\s*\.eq\('student_id', student\.id\)\s*\.eq\('session_id', data\.session\.id\)\s*\.select\(\);\s*if \(updateError\) throw updateError;\s*if \(!updateData \|\| updateData\.length === 0\) \{\s*throw new Error\('Update affected 0 rows\. Please check if the student is in the current session\.'\);\s*\}\s*const \{ error: deleteError \} = await supabase\.from\('notices'\)\s*\.delete\(\)\s*\.eq\('id', promo\.id\);\s*if \(deleteError\) throw deleteError;\s*toast\.success\(`Promotion undone for \$\{student\.first_name\}`\);\s*mutateStudents\(\);\s*\} catch \(err: any\) \{/g;

const replacement = `    try {
      // First, check if they are already in the target section
      if (targetSectionId === fromSectionId) {
         // They are already in the correct section, just delete the invalid log
         await supabase.from('notices').delete().eq('id', promo.id);
         toast.success(\`Removed invalid promotion log for \${student.first_name}\`);
         mutateStudents();
         return;
      }

      const { error: updateError } = await supabase.from('student_sections')
        .update({ section_id: targetSectionId })
        .eq('student_id', student.id)
        .eq('session_id', data.session.id);
        
      if (updateError) throw updateError;

      const { error: deleteError } = await supabase.from('notices')
        .delete()
        .eq('id', promo.id);
        
      if (deleteError) throw deleteError;
      toast.success(\`Promotion undone for \${student.first_name}\`);
      mutateStudents();
    } catch (err: any) {`;

content = content.replace(targetRegex, replacement);

const targetRegex2 = /if \(!targetSectionId && promo\.from_section && promo\.from_class\) \{\s*const cls = classes\.find\(c => c\.name === promo\.from_class\);\s*if \(cls\) \{\s*const sec = sections\.find\(s => s\.class_id === cls\.id && s\.name === promo\.from_section\);\s*if \(sec\) \{\s*targetSectionId = sec\.id;\s*\}\s*\}\s*\}/g;

const replacement2 = `if (!targetSectionId && promo.from_section && promo.from_class) {
      const clsName = (promo.from_class || '').trim().toLowerCase();
      const secName = (promo.from_section || '').trim().toLowerCase();
      const cls = classes.find(c => (c.name || '').trim().toLowerCase() === clsName);
      if (cls) {
        const sec = sections.find(s => s.class_id === cls.id && (s.name || '').trim().toLowerCase() === secName);
        if (sec) {
          targetSectionId = sec.id;
        }
      }
    }`;

content = content.replace(targetRegex2, replacement2);

fs.writeFileSync('src/pages/school-admin/Promotions.tsx', content);
console.log("Replaced");
