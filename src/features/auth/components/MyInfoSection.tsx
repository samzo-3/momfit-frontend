import { useState } from 'react'
import type { User } from '../types'
import DeleteAccountSection from './DeleteAccountSection'
import ProfileForm from './ProfileForm'
import ProfileSummary from './ProfileSummary'
import ProfileView from './ProfileView'

// 내 정보 화면의 본문. 처음에는 읽기 전용으로 보여주고, "수정하기"를 누르면 수정 폼으로 바뀐다.
function MyInfoSection({ user }: { user: User }) {
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  // 수정에서 돌아왔는지. 돌아온 경우에만 "수정하기" 버튼에 포커스를 준다.
  const [returnedFromEdit, setReturnedFromEdit] = useState(false)

  // 넓은 화면(lg)에서는 왼쪽 요약 카드 + 오른쪽 정보·탈퇴 카드로 나눈다.
  // 좁은 화면에서는 하나의 카드 안에 위아래로 쌓는다. (카드 모양은 lg에서만 입힌다.)
  const card = 'lg:rounded-3xl lg:bg-white lg:p-8 lg:shadow-sm'

  return (
    <div className="lg:grid lg:grid-cols-[18rem_1fr] lg:items-start lg:gap-6">
      <ProfileSummary user={user} />
      <div className="flex flex-col gap-8 lg:gap-6">
        <div className={card}>
          {editing ? (
            <ProfileForm
              user={user}
              onSaved={() => {
                setEditing(false)
                setReturnedFromEdit(true)
                setNotice('저장되었습니다.')
              }}
              onCancel={() => {
                setEditing(false)
                setReturnedFromEdit(true)
                setNotice(null)
              }}
            />
          ) : (
            <ProfileView
              user={user}
              notice={notice}
              focusEditButton={returnedFromEdit}
              onEdit={() => {
                setNotice(null)
                setEditing(true)
              }}
            />
          )}
        </div>
        {!editing && (
          <>
            <hr className="border-line lg:hidden" />
            <div className={card}>
              <DeleteAccountSection />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MyInfoSection
